import os
from os.path import join as _join
import enum
import math

from fastapi import APIRouter, Query, Response, HTTPException, Body
from typing import Optional
from pydantic import BaseModel, Field, conlist, ValidationError, field_validator

from .cligen import CligenStationsManager, ClimateFile
from .cligen_utils import run_cligen, CligenError
from .hash_utils import stable_hash

router = APIRouter()

_thisdir = os.path.dirname(os.path.abspath(__file__))
# tmpfs path required by security policy
TMP_BASE = "/dev/shm/rockclim"  # nosec B108


class Location(BaseModel):
    longitude: float
    latitude: float
    
    def __hash__(self):
        return hash((self.longitude, self.latitude))


class UserDefinedParMod(BaseModel):
    description: str
    ppts: conlist(float, min_length=12, max_length=12)
    tmaxs: conlist(float, min_length=12, max_length=12)
    tmins: conlist(float, min_length=12, max_length=12)
    
    def __hash__(self):
        return hash((self.description, tuple(self.ppts), tuple(self.tmaxs), tuple(self.tmins)))


class ClimatePars(BaseModel):
    """
    ClimatePars is a Pydantic model representing the parameters for climate data.

    Attributes:
        database (Optional[str]): The name of the database. Options are:
            - None: Legacy database
            - 2015: US database from 2015
            - au: Australia
            - ghcn: International climate database
        state_code (Optional[str]): The state code. e.g. "WA"
        par_id (Optional[str]): The station PAR file ID e.g. "WA459074"
        input_years (int): The number of input years for stochastic generation.
        cligen_version (str): The version of the CLIGEN model. Options are:
            - 4.3: Legacy FSWEPP
            - 5.3.2: WEPPcloud
    """
    database: Optional[str] = "legacy"
    state_code: Optional[str] = None
    par_id: Optional[str] = None
    input_years: Optional[int] = 100
    cligen_version: Optional[str] = "5.3.2"
    location: Optional[Location] = None
    use_prism: Optional[bool] = False
    user_defined_par_mod: Optional[UserDefinedParMod] = None
    
    @field_validator('database')
    def validate_database(cls, value):
        if value not in [None, "legacy", "2015", "au", "ghcn"]:
            raise ValueError("Invalid database")
        return value

    @field_validator('cligen_version')
    def validate_cligen_version(cls, value):
        if value not in ["4.3", "5.3.2"]:
            raise ValueError("Invalid cligen_version")
        return value

    @field_validator('input_years')
    def validate_input_years(cls, value):
        if value is None:
            return value
        if value < 1 or value > 200:
            raise ValueError("input_years must be between 1 and 200")
        return value
    
    def __hash__(self):
        return hash((self.database, 
                     self.state_code, 
                     self.par_id,
                     self.input_years, 
                     self.cligen_version, 
                     self.location, 
                     self.use_prism, 
                     self.user_defined_par_mod))
    
    
@router.post("/rockclim/GET/available_state_codes")
def available_state_codes(
    climate_pars: ClimatePars = Body(
        ...,
        example={
            "database": "ghcn"
        }
    )
):
    stationManager = CligenStationsManager(climate_pars.database)
    sorted_keys = sorted(stationManager.states)
    return {k: stationManager.states[k] for k in sorted_keys}

class StationsGeoJSONRequest(BaseModel):
    database: Optional[str] = Field(
        description='Database name: "ghcn", "au", "2015", "legacy", or None (default to "legacy")'
    )
    bbox: conlist(float, min_length=4, max_length=4) = Field(
        description="Bounding box: [ul_x, ul_y, lr_x, lr_y]"
    )

    class Config:
        schema_extra = {
            "example": {
                "database": "2015",
                "bbox": [-120, 48, -115, 42]
            }
        }

@router.post("/rockclim/GET/stations_geojson")
def stations_geojson(
    payload: StationsGeoJSONRequest = Body(
        ...,
        example=
    {
      "database": "2015",
      "bbox": [-120, 48, -115, 42]
    }
    )
):
    stationManager = CligenStationsManager(payload.database, payload.bbox)
    return stationManager.to_geojson()


@router.post("/rockclim/GET/stations_in_state")
def stations_in_state(
    climate_pars: ClimatePars = Body(
        ...,
        example={
            'state_code': 'WA'
        }
    )
):
    stationManager = CligenStationsManager(climate_pars.database)

    if climate_pars.state_code is None:
        raise HTTPException(status_code=422, detail="State Code is required")
    
    stations = stationManager.get_stations_in_state(climate_pars.state_code)

    return [s.as_dict() for s in stations]


@router.post("/rockclim/GET/closest_stations")
def get_closest_stations(
    climate_pars: ClimatePars = Body(
        ...,
        example={
            'location': {
                'longitude': -116,
                'latitude': 47
            }
        }
    )
):
    if climate_pars.location is None:
        raise HTTPException(status_code=422, detail="Location is required")
    
    stationManager = CligenStationsManager(climate_pars.database)
    stations = stationManager.get_closest_stations(
        (climate_pars.location.longitude, climate_pars.location.latitude), 
        num_stations=10)

    return [s.as_dict() for s in stations]


def get_station(climate_pars: ClimatePars):
    stationManager = CligenStationsManager(climate_pars.database)
    if not climate_pars.par_id:
        raise HTTPException(status_code=422, detail="par_id is required")
    stationMeta = stationManager.get_station_fromid(climate_pars.par_id)
    if stationMeta is None:
        raise HTTPException(
            status_code=422,
            detail=f"Station not found for par_id {climate_pars.par_id}",
        )
    station = stationMeta.get_station()
    
    if climate_pars.use_prism:
        if climate_pars.location is None:
            raise HTTPException(status_code=422, detail="Location is required")
        
        station = station.prism_mod(
            climate_pars.location.longitude, 
            climate_pars.location.latitude)
        
    if climate_pars.user_defined_par_mod is not None:
        mod = climate_pars.user_defined_par_mod
        # user_defined_par_mod arrives in SI units (mm, °C). Convert to English
        # units expected by the station modifier (inches, °F).
        ppts_in = [v / 25.4 for v in mod.ppts]
        tmax_f = [(v * 9.0 / 5.0) + 32.0 for v in mod.tmaxs]
        tmin_f = [(v * 9.0 / 5.0) + 32.0 for v in mod.tmins]
        station = station.mod(ppts_in, tmax_f, tmin_f)
        
    return station
    
@router.post("/rockclim/GET/station_par")
def get_station_par(
    climate_pars: ClimatePars = Body(
        ...,
        example={
            'par_id': 'WA459074'
        }
    )
):
    station = get_station(climate_pars)
    return Response(content=station.contents, media_type="application/text")


@router.post("/rockclim/GET/station_par_monthlies")
def get_station_par_monthlies(
    climate_pars: ClimatePars = Body(
        ...,
        example={
            'par_id': 'WA459074',
            'location': {
                'longitude': -117.0,
                'latitude': 47.0
            },
            'use_prism': True
        }
    )
):
    station = get_station(climate_pars)
    # Convert station monthlies to SI units (mm, °C) before returning.
    ppt_in = list(station.ppts)
    tmax_f = list(station.tmaxs)
    tmin_f = list(station.tmins)
    ppts_mm = [v * 25.4 for v in ppt_in]
    tmax_c = [(v - 32.0) * (5.0 / 9.0) for v in tmax_f]
    tmin_c = [(v - 32.0) * (5.0 / 9.0) for v in tmin_f]
    # Avoid NumPy generator deprecation by computing directly.
    monthlies = {
        "ppts": ppts_mm,
        "nwds": list(station.nwds),
        "tmaxs": tmax_c,
        "tmins": tmin_c,
        "cumulative_ppts": sum(v * d for v, d in zip(ppts_mm, station.nwds)),
    }
    monthlies['cumulative_nwds'] = sum(monthlies['nwds'])
    return monthlies


def get_climate(climate_pars: ClimatePars):
    wd = TMP_BASE
    
    station = get_station(climate_pars)
    
    os.makedirs(wd, exist_ok=True)

    hash_id = stable_hash(climate_pars)
    cli_fname = f"{hash_id}.cli"

    par_fn = _join(wd, cli_fname[:-4] + ".par")
    station.write(par_fn)
    if not os.path.exists(par_fn):
        raise HTTPException(status_code=500, detail="Failed to write CLIGEN .par file.")

    cli_path = _join(wd, cli_fname)
    try:
        cli_path = run_cligen(
            par_fn,
            cli_path,
            climate_pars.input_years,
            cliver=climate_pars.cligen_version,
            randseed=12345,
            wd=wd,
        )
    except CligenError as exc:
        detail = str(exc)
        if exc.log_tail:
            detail = f"{detail} CLIGEN log tail:\n{exc.log_tail}"
        raise HTTPException(status_code=500, detail=detail) from exc

    return cli_path


@router.post("/rockclim/GET/climate")
def get_climate_route(
    climate_pars: ClimatePars = Body(
        ...,
        example={
            'par_id': 'WA459074',
            'input_years': 10
        }
    )
):
    """
    Endpoint to get climate data for a specific station.
    This function handles a POST request to retrieve climate data for a specific station
    based on the provided parameters. It creates necessary directories, generates a 
    climate file using Cligen, and returns the contents of the generated file.
    Args:
        climate_pars (ClimatePars): An object containing the parameters for the climate 
                                    data request, including database, station ID, Cligen 
                                    version, and input years.
    Returns:
        Response: A Response object containing the contents of the generated climate file 
                with media type "application/text".
    """
    cli_fn = get_climate(climate_pars)
    
    with open(cli_fn, "r") as file:
        contents = file.read()
    return Response(content=contents, media_type="application/text")

@router.post("/rockclim/GET/climate_monthlies")
def get_climate_monthlies_route(
    climate_pars: ClimatePars = Body(
        ...,
        example={
            'par_id': 'WA459074',
            'input_years': 10
        }
    )
):
    cli_fn = get_climate(climate_pars)
    climate = ClimateFile(cli_fn)
    monthlies = climate.calc_monthlies()
    # Convert English units (in, F) to SI (mm, C).
    ppts_mm = [v * 25.4 for v in monthlies.get("ppts", [])]
    tmax_c = [(v - 32.0) * (5.0 / 9.0) for v in monthlies.get("tmaxs", [])]
    tmin_c = [(v - 32.0) * (5.0 / 9.0) for v in monthlies.get("tmins", [])]
    monthlies["ppts"] = ppts_mm
    monthlies["tmaxs"] = tmax_c
    monthlies["tmins"] = tmin_c
    return monthlies
    

import os
import json
from os.path import join as _join
import enum
import math

from fastapi import APIRouter, Query, Response, Request, HTTPException, Body
from typing import Optional
from pydantic import BaseModel, Field, conlist, ValidationError, field_validator

from wepppy2.climates.cligen import CligenStationsManager, Cligen, ClimateFile

router = APIRouter()

_thisdir = os.path.dirname(os.path.abspath(__file__))


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
    stationMeta = stationManager.get_station_fromid(climate_pars.par_id)
    station = stationMeta.get_station()
    
    if climate_pars.use_prism:
        if climate_pars.location is None:
            raise HTTPException(status_code=422, detail="Location is required")
        
        station = station.prism_mod(
            climate_pars.location.longitude, 
            climate_pars.location.latitude)
        
    if climate_pars.user_defined_par_mod is not None:
        station = station.mod(
            climate_pars.user_defined_par_mod.ppts,
            climate_pars.user_defined_par_mod.tmaxs,
            climate_pars.user_defined_par_mod.tmins)
        
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
    monthlies = station.get_monthlies()
    monthlies['cumulative_nwds'] = sum(monthlies['nwds'])
    return monthlies


def get_climate(climate_pars: ClimatePars):
    wd="/ramdisk/rockclim/"
    
    station = get_station(climate_pars)
    
    os.makedirs(wd, exist_ok=True)

    _hash = hash(climate_pars)
    cli_fname = f"{_hash}.cli"
    
    cligen = Cligen(station, wd, cliver=climate_pars.cligen_version)
    cligen.run_multiple_year(climate_pars.input_years, cli_fname=cli_fname)
    
    return _join(wd, cli_fname)


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
    return climate.calc_monthlies()
    

def load_user_data(filepath):
    if os.path.exists(filepath):
        with open(filepath, 'r') as file:
            return json.load(file)
    return {}


def save_user_data(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as file:
        json.dump(data, file, indent=4)


@router.post("/rockclim/PUT/user_defined_par")
@router.put("/rockclim/PUT/user_defined_par")
def save_user_defined_par_mod(
    request: Request,
    climate_pars: ClimatePars = Body(
        ...,
        example={
            'par_id': 'WA459074',
            'user_defined_par_mod': {
                'description': 'my custom par',
                'ppts': [0.34, 0.36, 0.48, 0.54, 0.53, 0.4, 0.45, 0.26, 0.28, 0.43, 0.34, 0.33],
                'tmaxs': [36.31, 40.42, 47.86, 55.38, 64.82, 70.74, 82.29, 83.43, 73.74, 58.84, 43.67, 35.31],
                'tmins': [24.55, 25.54, 29.29, 33.7, 39.99, 44.99, 48.65, 47.92, 41.87, 35.02, 29.38, 24.04]
            }
        }
    )
):
    user_id = request.cookies.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found in cookies")
    
    if climate_pars.user_defined_par_mod is None:
        raise HTTPException(status_code=422, detail="User-defined parameters are required")
    
    try:
        get_station(climate_pars)
    except:
        raise HTTPException(status_code=422, detail="ClimatePars is not valid")
    
    user_custom_db_path = _join(_thisdir, f'db/users/rockclim/{user_id}.json')
    user_data = load_user_data(user_custom_db_path)
    par_mod_key = str(hash(climate_pars))

    # Check if the entry already exists
    if par_mod_key not in user_data:
        user_data[par_mod_key] = climate_pars.dict()
        save_user_data(user_custom_db_path, user_data)
        return {
            "message": f"New entry added with key: {par_mod_key}",
            "par_mod_key": par_mod_key
        }
    else:
        return {"message": f"Entry already exists with key: {par_mod_key}"}


@router.post("/rockclim/DEL/user_defined_par")
def del_user_defined_par_mod(
    request: Request,
    climate_pars: ClimatePars = Body(
        ...,
        example={
            'par_id': 'WA459074',
            'user_defined_par_mod': {
                'description': 'my custom par',
                'ppts': [0.34, 0.36, 0.48, 0.54, 0.53, 0.4, 0.45, 0.26, 0.28, 0.43, 0.34, 0.33],
                'tmaxs': [36.31, 40.42, 47.86, 55.38, 64.82, 70.74, 82.29, 83.43, 73.74, 58.84, 43.67, 35.31],
                'tmins': [24.55, 25.54, 29.29, 33.7, 39.99, 44.99, 48.65, 47.92, 41.87, 35.02, 29.38, 24.04]
            }
        }
    )
):
    user_id = request.cookies.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found in cookies")
    
    if climate_pars.user_defined_par_mod is None:
        raise HTTPException(status_code=400, detail="User-defined parameters are required")
    
    user_custom_db_path = _join(_thisdir, f'db/users/rockclim/{user_id}.json')
    user_data = load_user_data(user_custom_db_path)
    par_mod_key = str(hash(climate_pars))

    if par_mod_key in user_data:
        del user_data[par_mod_key]
        save_user_data(user_custom_db_path, user_data)
        return {"message": f"New entry deleted with key: {par_mod_key}"}
    else:
        return {"message": f"Entry not found: {par_mod_key}"}

@router.get("/rockclim/GET/user_defined_pars")
def list_user_defined_pars(request: Request):
    user_id = request.cookies.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found in cookies")
    
    user_custom_db_path = _join(_thisdir, f'db/users/rockclim/{user_id}.json')
    
    # Load existing data
    user_data = load_user_data(user_custom_db_path)
    
    if not user_data:
        return user_data
    
    # Return the list of user-defined parameters
    return user_data

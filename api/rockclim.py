import os
from os.path import join as _join
import enum
import math

from fastapi import APIRouter, Query, Response, Request
from typing import Optional
from pydantic import BaseModel

from wepppy2.climates.cligen import CligenStationsManager, Cligen

router = APIRouter()


class Location(BaseModel):
    longitude: float
    latitude: float


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
    use_prism: Optional[bool] = None 
    
    def __hash__(self):
        return hash((self.database, self.state_code, self.par_id, self.input_years, self.cligen_version))
    
    
@router.post("/rockclim/GET/stations_in_state")
def stations_in_state(climate_pars: ClimatePars):
    stationManager = CligenStationsManager(climate_pars.database)

    if climate_pars.state is None:
        return {"error": "State is required"}
    
    stations = stationManager.get_stations_in_state(climate_pars.state)

    return [s.as_dict() for s in stations]


@router.post("/rockclim/GET/get_closest_stations")
def get_closest_stations(climate_pars: ClimatePars):
    if climate_pars.location is None:
        return  {"error": "Location is required"}
    
    stationManager = CligenStationsManager(climate_pars.database)
    stations = stationManager.get_closest_stations(
        (climate_pars.location.longitude, climate_pars.location.latitude), 
        num_stations=10)

    return [s.as_dict() for s in stations]


def get_station_par(climate_pars: ClimatePars):
    stationManager = CligenStationsManager(climate_pars.database)
    stationMeta = stationManager.get_station_fromid(climate_pars.par_id)
    station = stationMeta.get_station()
    
    if climate_pars.location is not None and climate_pars.use_prism:
        station = station.prism_mod(
            climate_pars.location.longitude, 
            climate_pars.location.latitude)
        
    return station
    
@router.post("/rockclim/GET/station_par")
def get_station_par(climate_pars: ClimatePars):
    station = get_station_par(climate_pars)
    return Response(content=station.contents, media_type="application/text")


@router.post("/rockclim/GET/station_par_monthlies")
def get_station_par_monthlies(climate_pars: ClimatePars):
    station = get_station_par(climate_pars)
    return station.get_monthlies()


@router.post("/rockclim/GET/climate")
def get_climate(climate_pars: ClimatePars):
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
    station = get_station_par(climate_pars)
    
    os.makedirs("/ramdisk/rockclim/", exist_ok=True)

    _hash = hash(climate_pars)
    cli_fname = f"{_hash}.cli"
    
    cligen = Cligen(station, wd="/ramdisk/rockclim/", cliver=climate_pars.cligen_version)
    cligen.run_multiple_year(climate_pars.input_years, cli_fname=cli_fname)
    
    with open(f"/ramdisk/rockclim/{cli_fname}", "r") as file:
        contents = file.read()
    return Response(content=contents, media_type="application/text")


@router.post("/rockclim/MOD/station_par")
def get_climate(climate_pars: ClimatePars, request: Request):
    user_id = request.cookies.get("user_id")
    if not user_id:
        return {"error": "User ID not found in cookies"}
    
    return {"user_id": user_id}



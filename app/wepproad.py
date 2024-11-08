import os
import enum

from fastapi import APIRouter, Query
from typing import Optional
from typing import Optional
from pydantic import BaseModel


router = APIRouter()

class RoadDesign(enum.Enum):
    INVEG = 'inveg'
    OUTUNRUT = 'outunrut'
    OUTRUT = 'outrut'
    INBARE = 'inbare'

class RoadSurface(enum.Enum):
    GRAVEL = 'gravel'
    PAVED = 'paved'
    
class SoilTexture(enum.Enum):
    CLAY = 'clay'
    SILT = 'silt'
    SAND = 'sand'
    LOAM = 'loam'

class TrafficLevel(enum.Enum):
    HIGH = 'high'
    LOW = 'low'
    NONE = 'none'

class Road(BaseModel):
    gradient: int
    length_ft: float
    width_ft: float
    surface: RoadSurface
    design: RoadDesign
    traffic: TrafficLevel

class Fill(BaseModel):
    gradient: int
    length_ft: float

class Buffer(BaseModel):
    gradient: int
    length_ft: float

class WepproadPars(BaseModel):
    soil_texture: SoilTexture
    road: Road
    fill: Fill
    buffer: Buffer

class Climate(BaseModel):
    database: str
    par: str
    input_years: int

class WeppRoadState(BaseModel):
    climate: Climate
    wepproad_pars: WepproadPars
    

soil_data_dir = 'db/soils'

def get_soil_file_template(state: WeppRoadState):
    global soil_data_dir
    
    surface = state.wepproad_pars.road.surface
    soil_texture = state.wepproad_pars.soil_texture
    road_design = state.wepproad_pars.road.design
    
    surf = ''
    if surface == RoadSurface.GRAVEL:
        surf = 'g'
    elif surface == RoadSurface.PAVED:
        surf = 'p'

    if road_design not in RoadDesign:
        raise ValueError(f"Invalid slope type: {road_design}")

    # Determine tauC value
    tau_c = '2'
    if road_design == 'inveg':
        tau_c = '10'
    elif road_design == 'inbare' and surf == 'p':
        tau_c = '1'

    # Construct soil file name
    soil_file = f"3{surf}{soil_texture}{tau_c}.sol"
    soil_file_path = os.path.join(soil_data_dir, soil_file)

    # Check if soil file exists
    if not os.path.exists(soil_file_path):
        raise FileNotFoundError(f"Soil file {soil_file} does not exist")

    return soil_file_path


@router.get("/wepproad/GET/soil")
def get_soil(state: WeppRoadState):
    soil_file_path = get_soil_file_template(state)
    return {"soil_file_path": soil_file_path}

@router.get("/wepproad/GET/management")
def get_management(road_design: str = Query(..., enum=["inbare", "inveg", "outrut", "outrunrut"])):
    return {"road_design": road_design}

@router.get("/wepproad/GET/climate")
def get_climate(database: str = Query(...), par: str = Query(...), input_years: int = Query(...)):
    return {
        "climate": {
            "database": database,
            "par": par,
            "input_years": input_years
        }
    }

@router.get("/wepproad/GET/wepp")
def get_wepp(
    road_gradient: Optional[int] = Query(None),
    road_length_ft: Optional[float] = Query(None),
    road_width_ft: Optional[float] = Query(None),
    fill_gradient: Optional[int] = Query(None),
    fill_length_ft: Optional[float] = Query(None),
    buffer_gradient: Optional[int] = Query(None),
    buffer_length_ft: Optional[float] = Query(None)
):
    return {
        "road": {
            "gradient": road_gradient,
            "length_ft": road_length_ft,
            "width_ft": road_width_ft
        },
        "fill": {
            "gradient": fill_gradient,
            "length_ft": fill_length_ft
        },
        "buffer": {
            "gradient": buffer_gradient,
            "length_ft": buffer_length_ft
        }
    }

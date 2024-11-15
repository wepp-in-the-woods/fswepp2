import os
from os.path import join as _join
from os.path import split as _split
from os.path import exists as _exists

import shutil
import yaml
import enum
import math

from copy import deepcopy

import numpy as np
from fastapi import APIRouter, Query, Response, Request, HTTPException, Body
from typing import Optional
from pydantic import BaseModel, ValidationError, field_validator

from .rockclim import ClimatePars
from .shared_models import SoilTexture

router = APIRouter()

_thisdir = os.path.dirname(os.path.abspath(__file__))

soil_data_dir = _join(_thisdir, 'db/wepproad/soils')
management_data_dir = _join(_thisdir, 'db/wepproad/managements')


class BurnSeverity(enum.Enum):
    High = 'High'
    Moderate = 'Moderate'
    Low = 'Low'
    Unburned = 'Unburned'

    __str__ = lambda self: self.value
    __hash__ = lambda self: hash(self.value)


class VegetationType(enum.Enum):
    Forest = 'Forest'
    Range = 'Range'
    Chaparral = 'Chaparral'
    
class ErmitPars(BaseModel):
    top_slope_pct: float
    middle_slope_pct: float
    bottom_slope_pct: float
    length_ft: Optional[float] = None
    length_m: Optional[float] = None
    soil_texture: SoilTexture
    rfg_pct: float
    vegetation_type: VegetationType
    burn_severity: BurnSeverity
    user_shrub_pct: Optional[float] = None
    user_grass_pct: Optional[float] = None
    user_bare_pct: Optional[float] = None
    
    @field_validator("rfg_pct")
    def check_rfg_pct(cls, value):
        if value < 5 or value > 85:
            raise ValueError("rfg_pct must be between 5 and 85")
        return value
    
    @field_validator("top_slope_pct", "middle_slope_pct", "bottom_slope_pct")
    def check_slope_pct(cls, value):
        if value < 0.001 or value > 100:
            raise ValueError("Slope percentages must be between 0.001 and 100")
        return value
    
    @property
    def top_slope(self):
        return self.top_slope_pct / 100.0
    
    @property
    def middle_slope(self):
        return self.middle_slope_pct / 100.0
    
    @property
    def bottom_slope(self):
        return self.bottom_slope_pct / 100.0
    
    @property
    def pre_fire_shrub_pct(self):
        if self.vegetation_type == VegetationType.Forest:
            return None
        
        if self.user_shrub_pct is not None:
            return self.user_shrub_pct
        elif self.vegetation_type == VegetationType.Range:
            return 15.0
        elif self.vegetation_type == VegetationType.Chaparral:
            return 80.0
        
        raise ValueError("Invalid vegetation type")
    
    @property
    def pre_fire_grass_pct(self):
        if self.vegetation_type == VegetationType.Forest:
            return None
        
        if self.user_grass_pct is not None:
            return self.user_grass_pct
        elif self.vegetation_type == VegetationType.Range:
            return 75.0
        elif self.vegetation_type == VegetationType.Chaparral:
            return 0.0
        
        raise ValueError("Invalid vegetation type")
    
    @property
    def pre_fire_bare_pct(self):
        if self.vegetation_type == VegetationType.Forest:
            return None
        
        if self.user_bare_pct is not None:
            return self.user_bare_pct

        return 100 - self.pre_fire_shrub_pct - self.pre_fire_grass_pct
        
    
    def __setattr__(self, key, value):
        super().__setattr__(key, value)
        
        if key == "length_ft" and value is not None:
            super().__setattr__("length_m", value * 0.3048)
        elif key == "length_m" and value is not None:
            super().__setattr__("length_ft", value / 0.3048)
            
        if key == "width_ft" and value is not None:
            super().__setattr__("width_m", value * 0.3048)
        elif key == "width_m" and value is not None:
            super().__setattr__("width_ft", value / 0.3048)
            
    def __hash__(self):
        return hash((self.top_slope_pct, self.middle_slope_pct, self.bottom_slope_pct, 
                     self.length_ft, self.soil_texture, self.rfg_pct, 
                     self.vegetation_type, self.burn_severity, 
                     self.user_shrub_pct, self.user_grass_pct, self.user_bare_pct))
        
        
class ErmitState(BaseModel):
    climate: ClimatePars
    ermit_pars: ErmitPars
    
    def __hash__(self):
        return hash((self.climate, self.ermit_pars))
    
    
soil_db_file = _join(_thisdir, "db/ermit/soilsdb.yaml")

with open(soil_db_file, 'r') as file:
    soil_db = yaml.safe_load(file)

def load_soil_parameters(file_path, vegtype, soiltype):
    with open(file_path, 'r') as file:
        data = yaml.safe_load(file)
        return data.get(vegtype, {}).get(soiltype, {})


def get_soil_parameters(ermit_pars: ErmitPars):
    global soil_db
    
    vegetation_type = 'non_forest'
    if ermit_pars.vegetation_type == VegetationType.Forest:
        vegetation_type = 'forest'
        
    soil_texture = str(ermit_pars.soil_texture).lower()
    soil_parameters = deepcopy(soil_db[vegetation_type][soil_texture])
    
    if vegetation_type == 'forest':
        return soil_parameters
    
    # non-forest vegetation is weighted by pre-fire vegetation cover
    shrub = ermit_pars.pre_fire_shrub_pct / 100.0
    grass = ermit_pars.pre_fire_grass_pct / 100.0
    bare = ermit_pars.pre_fire_bare_pct / 100.0
    
    for parameter in ['ki', 'ksat']:
        d = {}
        for severity_code in ['u', 'l', 'h']:
            _x = shrub * np.array(soil_parameters[parameter]['shrub'][severity_code]) + \
                 grass * np.array(soil_parameters[parameter]['grass'][severity_code]) + \
                 bare * np.array(soil_parameters[parameter]['bare'][severity_code])
            d[severity_code] = [float(v) for v in _x]
        soil_parameters[parameter] = d
           
    return soil_parameters
    
    
def create_soil_file(spatial_severity: str, k: int, ermit_pars: ErmitPars):
    """
    Create a soil file for ERMiT given various parameters.

    """
    ver = '2014.02.06'
    
    _last = None
    _severities = []
    for severity in spatial_severity:
        if severity != _last:
            _severities.append(severity)
        _last = severity
    
    _severities = ''.join(_severities)
    nofe = len(_severities)

    ksflag = 0  # hold internal hydraulic conductivity constant (0 => do not adjust internally)
    nsl = 1  # number of soil layers for the current OFE
    salb = 0.2  # albedo of the bare dry surface soil on the current OFE
    sat = 0.75  # initial saturation level of the soil profile porosity (m/m)
    rfg = ermit_pars.rfg_pct / 100.0  # rock fragment content of the soil profile
    
    soil_parameters = get_soil_parameters(ermit_pars)
    
    contents = f"95.1\n#  WEPP '{ermit_pars.soil_texture}' '{spatial_severity}{k}' {ermit_pars.vegetation_type} soil input file for ERMiT"
    if ermit_pars.vegetation_type != VegetationType.Forest:
        contents += f"\n#  {ermit_pars.pre_fire_shrub_pct}% shrub {ermit_pars.pre_fire_grass_pct}% grass"
    contents += "\n#  Data from U.S. Forest Service RMRS Air, Water and Aquatic Environments (AWAE) Project, Moscow FSL"
    
    contents += f"\n{nofe}\t{ksflag}\n"
    
    for severity_code in _severities:
        contents += f"'ERMiT_{severity_code}{k}'\t'{ermit_pars.soil_texture}'\t{nsl}\t{salb}\t{sat}\t"
        contents += f"{soil_parameters['ki'][severity_code][k]}\t{soil_parameters['kr'][severity_code][k]}\t{soil_parameters['tauc'][severity_code]}\t{soil_parameters['ksat'][severity_code][k]}"
        contents += f"\n{soil_parameters['solthk']}\t{soil_parameters['sand']}\t{soil_parameters['clay']}\t{soil_parameters['orgmat']}\t{soil_parameters['cec']}\t{rfg}\n";

    _hash = hash(ermit_pars)
    soil_file = _join(_thisdir, '/ramdisk/ermit/', f"ermit_{_hash}_{spatial_severity}{k}.sol")
    
    os.makedirs(os.path.dirname(soil_file), exist_ok=True)
    
    with open(soil_file, 'w') as f:
        f.write(contents)
        
    return soil_file


def get_severity_data(severity_class: BurnSeverity):
    """
    Get the severity and probability spatial values based on severity class.
    
    Parameters:
    severity_class (str): The severity class (e.g., 'h', 'm', 'l', 'u').
    
    Returns:
    tuple: A tuple containing the severe list and probspatial list.
    """
    severity_class = severity_class.lower()

    if severity_class == BurnSeverity.High:
        spatial_severities = ["hhh", "lhh", "hlh", "hhl", "llh", "lhl", "hll", "lll"]
        probspatial = [
            [0.10, 0.30, 0.30, 0.30, 0.00, 0.00, 0.00, 0.00],
            [0.00, 0.25, 0.25, 0.25, 0.25, 0.00, 0.00, 0.00],
            [0.00, 0.00, 0.25, 0.25, 0.25, 0.25, 0.00, 0.00],
            [0.00, 0.00, 0.00, 0.25, 0.25, 0.25, 0.25, 0.00],
            [0.00, 0.00, 0.00, 0.00, 0.25, 0.25, 0.25, 0.25],
        ]
    elif severity_class == BurnSeverity.Moderate:
        spatial_severities = ["hlh", "hhl", "llh", "lhl", "hll", "lll"]
        probspatial = [
            [0.25, 0.25, 0.25, 0.25, 0.00, 0.00],
            [0.00, 0.25, 0.25, 0.25, 0.25, 0.00],
            [0.00, 0.00, 0.25, 0.25, 0.25, 0.25],
            [0.00, 0.00, 0.25, 0.25, 0.25, 0.25],
            [0.00, 0.00, 0.25, 0.25, 0.25, 0.25],
        ]
    elif severity_class == BurnSeverity.Low:
        spatial_severities = ["llh", "lhl", "hll", "lll"]
        probspatial = [
            [0.30, 0.30, 0.30, 0.10],
            [0.25, 0.25, 0.25, 0.25],
            [0.25, 0.25, 0.25, 0.25],
            [0.25, 0.25, 0.25, 0.25],
            [0.25, 0.25, 0.25, 0.25],
        ]
    elif severity_class == BurnSeverity.Unburned:
        spatial_severities = ["uuu"]
        probspatial = [[1.0], [1.0], [1.0], [1.0], [1.0]]
    else:
        raise ValueError(f"Invalid severity class: {severity_class}")

    return spatial_severities, probspatial


def create_slope_file(spatial_severity: str, ermit_pars: ErmitPars):
    """
    Create a topography file based on severity and slope specifications.
    
    Parameters:
    spatial_severities (str): Spatial severity representation (e.g., "lll", "lhl", "hhl" etc.)
    ermit_pars (ErmitPars): The ERMIT parameters.
    """
    
    top_slope = ermit_pars.top_slope
    middle_slope = ermit_pars.middle_slope
    bottom_slope = ermit_pars.bottom_slope

    if spatial_severity.lower() in ["lll", "hhh", "uuu"]:
        length1 = ermit_pars.length_m
        contents = f"""97.5
#
# Slope file created for soil condition {spatial_severity}
#
#  1 ofe (1/1) aaa
#  Author:   dehall
#
1
213.0000  5.0000
4  {length1}
0.0, {top_slope}\t0.1, {middle_slope}\t0.9, {middle_slope}\t1.0, {bottom_slope}
"""

    elif spatial_severity.lower() in ["llh", "hhl"]:
        length2 = ermit_pars.length_m / 3
        length1 = ermit_pars.length_m - length2
        contents = f"""97.5
#
# Slope file created for soil condition {spatial_severity}
#
#  2 ofe (2/3, 1/3) aab
#  Author:   dehall
#
2
213.0000  5.0000
3  {length1}
0, {top_slope}\t0.15, {middle_slope}\t1.0, {middle_slope}
3  {length2}
0, {middle_slope}\t0.7, {middle_slope}\t1.0, {bottom_slope}
"""

    elif spatial_severity.lower() in ["lhl", "hlh"]:
        length1 = ermit_pars.length_m / 3
        length2 = length1
        length3 = ermit_pars.length_m - length1 - length2
        contents = f"""97.5
#
# Slope file created for soil condition {spatial_severity}
#
#  3 ofe (1/3, 1/3, 1/3) aba
#  Author:   dehall
#
3
213.0000  5.0000
3  {length1}
0, {top_slope}\t0.3, {middle_slope}\t1.0, {middle_slope}
2  {length2}
0, {middle_slope}\t1.0, {middle_slope}
3  {length3}
0, {middle_slope}\t0.7, {middle_slope}\t1.0, {bottom_slope}
"""

    elif spatial_severity.lower() in ["lhh", "hll"]:
        length1 = ermit_pars.length_m / 3
        length2 = ermit_pars.length_m - length1
        contents = f"""97.5
#
# Slope file created for soil condition {spatial_severity}
#
#  2 ofe (1/3, 2/3) abb
#  Author:   dehall
#
2
213.0000  5.0000
3  {length1}
0, {top_slope}\t0.3, {middle_slope}\t1.0, {middle_slope}
3  {length2}
0, {middle_slope}\t0.85, {middle_slope}\t1.0, {bottom_slope}
"""

    _hash = hash(ermit_pars)
    slope_file = _join(_thisdir, '/ramdisk/ermit/', f"ermit_{_hash}_{spatial_severity}.slp")
    
    os.makedirs(os.path.dirname(slope_file), exist_ok=True)
    
    with open(slope_file, 'w') as f:
        f.write(contents)
        
    return slope_file
    

example_pars = {
    "ermit_pars": {
        "top_slope_pct": 10,
        "middle_slope_pct": 15,
        "bottom_slope_pct": 5,
        "length_m": 100,
        "soil_texture": "clay",
        "rfg_pct": 5,
        "vegetation_type": "Forest",
        "burn_severity": "High"
  },
    "climate": {
        "par_id": "WA459074",
        "input_years": 100
    }
}

@router.post("/ermit/GET/slope/{spatial_severity}")
def get_soil(spatial_severity: str, state: ErmitState = Body(
        ...,
        example=example_pars
    )
):
    try:
        slope_file = create_slope_file(spatial_severity, state.ermit_pars)
        contents = open(slope_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    
@router.post("/ermit/GET/soil/{spatial_severity}/{k}")
def get_soil(spatial_severity: str, k:int, state: ErmitState = Body(
        ...,
        example=example_pars
    )
):
    try:
        soil_file = create_soil_file(spatial_severity, k, state.ermit_pars)
        contents = open(soil_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
        
        
import os
from os.path import join as _join
from os.path import split as _split
from os.path import exists as _exists

import time
import json
import shutil
import yaml
import enum
import math
import subprocess

from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
from fastapi import APIRouter, Query, Response, Request, HTTPException, Body
from fastapi.responses import JSONResponse

from typing import Optional
from pydantic import BaseModel, ValidationError, field_validator

from wepppy2.climates.cligen import ClimateFile

from .rockclim import ClimatePars, get_climate
from .shared_models import SoilTexture
from .wepp import parse_wepp_soil_output, get_annual_maxima_events_from_ebe, get_selected_events_from_ebe
from .logger import log_run

router = APIRouter()

_thisdir = os.path.dirname(os.path.abspath(__file__))

management_data_dir = _join(_thisdir, 'db/ermit/managements')

soil_db_file = _join(_thisdir, "db/ermit/soilsdb.yaml")

with open(soil_db_file, 'r') as file:
    soil_db = yaml.safe_load(file)


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
        
    
    def __hash__(self):
        return hash((self.top_slope_pct, self.middle_slope_pct, self.bottom_slope_pct, 
                     self.length_m, self.soil_texture, self.rfg_pct, 
                     self.vegetation_type, self.burn_severity, 
                     self.user_shrub_pct, self.user_grass_pct, self.user_bare_pct))
        
        
class ErmitState(BaseModel):
    climate: ClimatePars
    ermit_pars: ErmitPars
    wepp_version: str = "wepp2010"
    
    def __hash__(self):
        return hash((self.climate, self.ermit_pars, self.wepp_version))
    
    
def load_soil_parameters(file_path, vegtype, soiltype):
    with open(file_path, 'r') as file:
        data = yaml.safe_load(file)
        return data.get(vegtype, {}).get(soiltype, {})


def get_soil_parameters(ermit_state: ErmitState):
    global soil_db
    
    ermit_pars = ermit_state.ermit_pars
    
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
    
    
def create_soil_file(spatial_severity: str, k: int, ermit_state: ErmitState) -> str:
    """
    Create a soil file for ERMiT given various parameters.

    """
    ermit_pars = ermit_state.ermit_pars
    
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
    
    soil_parameters = get_soil_parameters(ermit_state)
    
    contents = f"95.1\n#  WEPP '{ermit_pars.soil_texture}' '{spatial_severity}{k}' {ermit_pars.vegetation_type} soil input file for ERMiT"
    if ermit_pars.vegetation_type != VegetationType.Forest:
        contents += f"\n#  {ermit_pars.pre_fire_shrub_pct}% shrub {ermit_pars.pre_fire_grass_pct}% grass"
    contents += "\n#  Data from U.S. Forest Service RMRS Air, Water and Aquatic Environments (AWAE) Project, Moscow FSL"
    
    contents += f"\n{nofe}\t{ksflag}\n"
    
    for severity_code in _severities:
        contents += (
            f"'ERMiT_{severity_code}{k}'\t'{ermit_pars.soil_texture}'\t{nsl}\t{salb}\t{sat}\t"
            f"{soil_parameters['ki'][severity_code][k]}\t{soil_parameters['kr'][severity_code][k]}\t"
            f"{soil_parameters['tauc'][severity_code]}\t{soil_parameters['ksat'][severity_code][k]}"
            f"\n{soil_parameters['solthk']}\t{soil_parameters['sand']}\t{soil_parameters['clay']}\t"
            f"{soil_parameters['orgmat']}\t{soil_parameters['cec']}\t{rfg}\n"
        )

    _hash = hash(ermit_pars)
    soil_file = _join(_thisdir, '/ramdisk/ermit/', f"e_{_hash}_{spatial_severity}{k}.sol")
    
    os.makedirs(os.path.dirname(soil_file), exist_ok=True)
    
    with open(soil_file, 'w') as f:
        f.write(contents)
        
    return soil_file


def get_spatial_severities(severity_class: BurnSeverity) -> tuple:
    """
    Get the severity and probability spatial values based on severity class.
    
    Parameters:
    severity_class (str): The severity class (e.g., 'h', 'm', 'l', 'u').
    
    Returns:
    tuple: A tuple containing the severe list
    """

    if severity_class == BurnSeverity.High:
        spatial_severities = ["hhh", "lhh", "hlh", "hhl", "llh", "lhl", "hll", "lll"]
    elif severity_class == BurnSeverity.Moderate:
        spatial_severities = ["hlh", "hhl", "llh", "lhl", "hll", "lll"]
    elif severity_class == BurnSeverity.Low:
        spatial_severities = ["llh", "lhl", "hll", "lll"]
    elif severity_class == BurnSeverity.Unburned:
        spatial_severities = ["uuu"]
    else:
        raise ValueError(f"Invalid severity class: {severity_class}")
    
    return spatial_severities


def get_probabilities(severity_class: BurnSeverity, is_moonsoonal: bool, spatial_severities: list, selected_years: list, sed_results) -> dict:
    """
    Get the probabilities based on severity class.
    
    Parameters:
    severity_class (str): The severity class (e.g., 'h', 'm', 'l', 'u').
    
    Returns:
    dict: A dictionary containing the probabilities.
    """

    if severity_class == BurnSeverity.High:
        prob_spatial = [
            [0.10, 0.30, 0.30, 0.30, 0.00, 0.00, 0.00, 0.00],
            [0.00, 0.25, 0.25, 0.25, 0.25, 0.00, 0.00, 0.00],
            [0.00, 0.00, 0.25, 0.25, 0.25, 0.25, 0.00, 0.00],
            [0.00, 0.00, 0.00, 0.25, 0.25, 0.25, 0.25, 0.00],
            [0.00, 0.00, 0.00, 0.00, 0.25, 0.25, 0.25, 0.25],
        ]
    elif severity_class == BurnSeverity.Moderate:
        prob_spatial = [
            [0.25, 0.25, 0.25, 0.25, 0.00, 0.00],
            [0.00, 0.25, 0.25, 0.25, 0.25, 0.00],
            [0.00, 0.00, 0.25, 0.25, 0.25, 0.25],
            [0.00, 0.00, 0.25, 0.25, 0.25, 0.25],
            [0.00, 0.00, 0.25, 0.25, 0.25, 0.25],
        ]
    elif severity_class == BurnSeverity.Low:
        prob_spatial = [
            [0.30, 0.30, 0.30, 0.10],
            [0.25, 0.25, 0.25, 0.25],
            [0.25, 0.25, 0.25, 0.25],
            [0.25, 0.25, 0.25, 0.25],
            [0.25, 0.25, 0.25, 0.25],
        ]
    elif severity_class == BurnSeverity.Unburned:
        prob_spatial = [[1.0], [1.0], [1.0], [1.0], [1.0]]
    else:
        raise ValueError(f"Invalid severity class: {severity_class}")
    
    prob_climate = ( 0.075, 0.075, 0.20, 0.275, 0.375 )
    
    _prob_soil_untreated = [
        [0.10, 0.20, 0.40, 0.20, 0.10],  # year 0
        [0.30, 0.30, 0.20, 0.19, 0.01],  # year 1
        [0.50, 0.30, 0.18, 0.01, 0.01],  # year 2
        [0.60, 0.30, 0.08, 0.01, 0.01],  # year 3
        [0.70, 0.27, 0.01, 0.01, 0.01],  # year 4
    ]

    # Update year_1 if it's monsoon season
    if is_moonsoonal:
        _prob_soil_untreated[1] = [0.12, 0.21, 0.38, 0.195, 0.095]

    # Seeding
    _prob_soil_seeding = [
        [0.10, 0.20, 0.40, 0.20, 0.10],  # year 0
        [0.50, 0.30, 0.18, 0.01, 0.01],  # year 1
        [0.60, 0.30, 0.08, 0.01, 0.01],  # year 2
        [0.70, 0.27, 0.01, 0.01, 0.01],  # year 3
        [0.70, 0.27, 0.01, 0.01, 0.01],  # year 4
    ]

    # Mulching 47% ground cover (1 Mg/ha ~1/2 ton/ac)
    _prob_soil_mulching_47 = [
        [0.70, 0.20, 0.08, 0.01, 0.01],  # year 0
        [0.60, 0.25, 0.13, 0.01, 0.01],  # year 1
        [0.50, 0.30, 0.18, 0.01, 0.01],  # year 2
        [0.60, 0.30, 0.08, 0.01, 0.01],  # year 3
        [0.70, 0.27, 0.01, 0.01, 0.01],  # year 4
    ]

    # Mulching 72% ground cover (2 Mg/ha ~1 ton/ac)
    _prob_soil_mulching_72 = [
        [0.90, 0.07, 0.01, 0.01, 0.01],  # year 0
        [0.70, 0.20, 0.08, 0.01, 0.01],  # year 1
        [0.50, 0.30, 0.18, 0.01, 0.01],  # year 2
        [0.60, 0.30, 0.08, 0.01, 0.01],  # year 3
        [0.70, 0.27, 0.01, 0.01, 0.01],  # year 4
    ]

    # Mulching 89% ground cover (3-1/2 Mg/ha ~1-1/2 ton/ac)
    _prob_soil_mulching_89 = [
        [0.93, 0.04, 0.01, 0.01, 0.01],  # year 0
        [0.77, 0.15, 0.06, 0.01, 0.01],  # year 1
        [0.50, 0.30, 0.18, 0.01, 0.01],  # year 2
        [0.60, 0.30, 0.08, 0.01, 0.01],  # year 3
        [0.70, 0.27, 0.01, 0.01, 0.01],  # year 4
    ]

    # Mulching 94% ground cover (4-1/2 Mg/ha ~2 ton/ac)
    _prob_soil_mulching_94 = [
        [0.96, 0.01, 0.01, 0.01, 0.01],  # year 0
        [0.78, 0.16, 0.04, 0.01, 0.01],  # year 1
        [0.50, 0.30, 0.18, 0.01, 0.01],  # year 2
        [0.60, 0.30, 0.08, 0.01, 0.01],  # year 3
        [0.70, 0.27, 0.01, 0.01, 0.01],  # year 4
    ]
    
    prob_soil = {
            "untreated": _prob_soil_untreated,
            "seeding": _prob_soil_seeding,
            "mulching_47": _prob_soil_mulching_47, # 1/2 ton / acre
            "mulching_72": _prob_soil_mulching_72, # 1 ton / acre
            "mulching_89": _prob_soil_mulching_89, # 1-1/2 ton / acre
            "mulching_94": _prob_soil_mulching_94, # 2 ton / acre
    }
     
    cum_probabilities = {}
    for treatment in prob_soil:
        cum_probabilities[treatment] = []
        for yr_after in range(5):
            cum_probabilities[treatment].append([0.01])
            
    sed_deliveries = []
    for event in sed_results:
        k = event['k']
        spatial_severity = event['spatial_severity']
        year = event['year']
        sed_delivery = event['sed_del_kg_m2']
        sed_deliveries.append(sed_delivery)
        
        _prob_climate = float(prob_climate[selected_years.index(year)])
                              
        for treatment in prob_soil:
            for yr_after in range(5):
                prob_spatial_d = dict(zip(spatial_severities, prob_spatial[yr_after]))
                _prob_spatial = float(prob_spatial_d[spatial_severity])
                
                _prob_soil_untreated = float(prob_soil[treatment][yr_after][k])
                
                if sed_delivery <= 0.0:
                    cum_probabilities[treatment][yr_after].append(1.0)
                else:
                    last_p = cum_probabilities[treatment][yr_after][-1]
                    if last_p >= 1.0:
                        continue
                    
                    prob = last_p + _prob_climate * _prob_spatial * _prob_soil_untreated
                    if prob > 1.0:
                        prob = 1.0
                    cum_probabilities[treatment][yr_after].append(prob)
        
    return cum_probabilities, sed_deliveries


def create_slope_file(spatial_severity: str, ermit_state: ErmitState) -> str:
    """
    Create a topography file based on severity and slope specifications.
    
    Parameters:
    spatial_severities (str): Spatial severity representation (e.g., "lll", "lhl", "hhl" etc.)
    ermit_state (ErmitState): The ERMIT State.
    """
    ermit_pars = ermit_state.ermit_pars
    
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
    slope_file = _join(_thisdir, '/ramdisk/ermit/', f"e_{_hash}_{spatial_severity}.slp")
    
    os.makedirs(os.path.dirname(slope_file), exist_ok=True)
    
    with open(slope_file, 'w') as f:
        f.write(contents)
        
    return slope_file
    
    
def get_management_file(spatial_severity: str, ermit_state: ErmitState) -> str:
    ermit_pars = ermit_state.ermit_pars
    
    man_file = None
    if spatial_severity.lower() == "uuu":
        if ermit_pars.vegetation_type == VegetationType.Forest:
            man_file = 'forest_95%_cover_80%_canopy.man'
        else:
            man_file = 'range_40%_cover_40%_canopy.man'
            
    else:
        _last = None
        _severities = []
        for severity in spatial_severity:
            if severity != _last:
                _severities.append(severity)
            _last = severity
        
        _severities = ''.join(_severities)
        nofe = len(_severities)
        
        man_file = f"{nofe}ofe.man"
        
    man_file_path = _join(management_data_dir, man_file)

    if not _exists(man_file_path):
        raise FileNotFoundError(f"I can't open file {man_file_path}")

    return man_file_path


def run_ermitwepp_short_climate(state: ErmitState, spatial_severity: str, k: int, cli_fn: str, selected_dates: list):
    
    cwd = '/ramdisk/ermit'
        
    slope_fn = create_slope_file(spatial_severity, state)
    _slope_fn = _split(slope_fn)[1]
    
    soil_fn = create_soil_file(spatial_severity, k, state)
    _soil_fn = _split(soil_fn)[1]
    
    man_fn = get_management_file(spatial_severity, state)
    _man_fn = _split(man_fn)[1]
    
    if not _exists(_join(cwd, f'{_man_fn}')):
        shutil.copyfile(man_fn, _join(cwd, f'{_man_fn}'))
    
    assert _exists(cli_fn), f"Climate file {cli_fn} does not exist"
    
    _hash = hash(state)
    run_fn = _join(cwd, f'e_{_hash}.{spatial_severity}{k}.run')
    output_fn = _join(cwd, f'e_{_hash}.{spatial_severity}{k}.dat')
    _output_fn = _split(output_fn)[1]
    
    ebe_fn = _join(cwd, f'e_{_hash}.{spatial_severity}{k}.ebe')
    _ebe_fn = _split(ebe_fn)[1]
    
    stout_fn = _join(cwd, f'e_{_hash}.{spatial_severity}{k}.stout')
    sterr_fn = _join(cwd, f'e_{_hash}.{spatial_severity}{k}.sterr')
    content = [
        "m",  # english or metric
        "y",  # not watershed
        "1",  # 1 = continuous
        "1",  # 1 = hillslope
        "n",  # hillslope pass file out?
        "1",  # 1 = abbreviated annual out, 2 = detailed annual out
        "n",  # initial conditions file?
        f"{_output_fn}",  # soil loss output file
        "n",  # water balance output?
        "n",  # crop output?
        "n",  # soil output?
        "n",  # distance/sed loss output?
        "n",  # large graphics output?
        "y",  # event-by-event out?
        f"{_ebe_fn}",  # event-by-event output file
        "n",  # element output?
        "n",  # final summary out?
        "n",  # daily winter out?
        "n",  # plant yield out?
        f"{_man_fn}",  # management file name
        f"{_slope_fn}",  # slope file name
        f"{cli_fn}",  # climate file name
        f"{_soil_fn}",  # soil file name
        "0",  # 0 = no irrigation
        f"{len(selected_dates)}",  # no. years to simulate
        "0"  # 0 = route all events
    ]
    
    content = "\n".join(content)

    with open(run_fn, 'w') as fp:
        fp.write(content)
        
    weppversion = f'/usr/lib/python3/dist-packages/wepppy2/wepp_runner/bin/{state.wepp_version}'
    
    if not _exists(weppversion):
        return {"error": f"WEPP version {state.wepp_version} not found"}

    command = f"{weppversion} <{run_fn} >{stout_fn} 2>{sterr_fn}"
    
    # wait 1 ms
    time.sleep(0.001)
    try:
        subprocess.run(command, shell=True, check=True, cwd=cwd)
    except subprocess.CalledProcessError as e:
        raise Exception(str(e))
        return {"error": str(e)}
    
    successful = False
    with open(stout_fn, 'r') as wepp_stout:
        for line in wepp_stout:
            if 'SUCCESSFUL' in line:
                successful = True
                break
    
    if not successful:
        raise Exception(open(stout_fn, 'r').read())
        return {"error": "WEPP run was not successful"}

    d = get_selected_events_from_ebe(ebe_fn, selected_dates)
    
    for i in range(len(d)):
        d[i]['spatial_severity'] = spatial_severity
        d[i]['k'] = k
        d[i]['sed_del_kg_m2'] = d[i]['sed_del_kg_m'] / state.ermit_pars.length_m
        
    return d


def run_ermitwepp(state: ErmitState):
    
    cwd = '/ramdisk/ermit'
    
    if state.ermit_pars.burn_severity == BurnSeverity.Unburned:
        spatial_severity = 'uuu'
        k = 1
    else:
        spatial_severity = 'hhh'
        k = 4   
        
    slope_fn = create_slope_file(spatial_severity, state)
    _slope_fn = _split(slope_fn)[1]
    
    soil_fn = create_soil_file(spatial_severity, k, state)
    _soil_fn = _split(soil_fn)[1]
    
    # apparently the management file is the same for all spatial severities
    man_fn = _join(management_data_dir, 'high100.man')
    _man_fn = _split(man_fn)[1]
    
    shutil.copyfile(man_fn, _join(cwd, f'{_man_fn}'))
    
    cli_fn = get_climate(state.climate)
    
    _hash = hash(state)
    run_fn = _join(cwd, f'e_{_hash}.100.run')
    output_fn = _join(cwd, f'e_{_hash}.100.dat')
    _output_fn = _split(output_fn)[1]
    
    ebe_fn = _join(cwd, f'e_{_hash}.100.ebe')
    _ebe_fn = _split(ebe_fn)[1]
    
    stout_fn = _join(cwd, f'e_{_hash}.100.stout')
    sterr_fn = _join(cwd, f'e_{_hash}.100.sterr')
    content = [
        "m",  # english or metric
        "y",  # not watershed
        "1",  # 1 = continuous
        "1",  # 1 = hillslope
        "n",  # hillslope pass file out?
        "2",  # 1 = abbreviated annual out, 2 = detailed annual out
        "n",  # initial conditions file?
        f"{_output_fn}",  # soil loss output file
        "n",  # water balance output?
        "n",  # crop output?
        "n",  # soil output?
        "n",  # distance/sed loss output?
        "n",  # large graphics output?
        "y",  # event-by-event out?
        f"{_ebe_fn}",  # event-by-event output file
        "n",  # element output?
        "n",  # final summary out?
        "n",  # daily winter out?
        "n",  # plant yield out?
        f"{_man_fn}",  # management file name
        f"{_slope_fn}",  # slope file name
        f"{cli_fn}",  # climate file name
        f"{_soil_fn}",  # soil file name
        "0",  # 0 = no irrigation
        f"{state.climate.input_years}",  # no. years to simulate
        "0"  # 0 = route all events
    ]
    
    content = "\n".join(content)

    with open(run_fn, 'w') as fp:
        fp.write(content)
        
    weppversion = f'/usr/lib/python3/dist-packages/wepppy2/wepp_runner/bin/{state.wepp_version}'
    
    if not _exists(weppversion):
        return {"error": f"WEPP version {state.wepp_version} not found"}

    command = f"{weppversion} <{run_fn} >{stout_fn} 2>{sterr_fn}"
    try:
        subprocess.run(command, shell=True, check=True, cwd=cwd)
    except subprocess.CalledProcessError as e:
        raise Exception(str(e))
        return {"error": str(e)}
    
    successful = False
    with open(stout_fn, 'r') as wepp_stout:
        for line in wepp_stout:
            if 'SUCCESSFUL' in line:
                successful = True
                break
    
    if not successful:
        raise Exception(open(stout_fn, 'r').read())
        return {"error": "WEPP run was not successful"}

    largest_runoff_events = get_annual_maxima_events_from_ebe(ebe_fn)
    runoff_year_ranks_descending = largest_runoff_events['runoff_year_ranks_descending']
    
    selected_ranks = [ 5, 10, 20, 50, 75 ]
    
    assert len(runoff_year_ranks_descending) >= selected_ranks[-1], len(runoff_year_ranks_descending)
    
    selected_years = [ runoff_year_ranks_descending[i-1] for i in selected_ranks ]
    
    cli_fn = get_climate(state.climate)
    climate = ClimateFile(cli_fn)
    is_moonsoonal = climate.is_monsoonal
    climate.selected_years_filter(selected_years)
    
    cli_truncated_fn = cli_fn.replace('.cli', '_.cli')
    climate.write(cli_truncated_fn)
    
    spatial_severities = get_spatial_severities(state.ermit_pars.burn_severity)
    
    selected_dates = []
    for year in selected_years:
        for event in largest_runoff_events['annual_maxima_events']:
            if event['year'] == year:
                selected_dates.append({'month': event['month'], 'day': event['day'], 'year': year})
                break
        
    assert len(selected_dates) == len(selected_years)
        
    sed_results = []
    with ThreadPoolExecutor() as executor:
        futures = [
            executor.submit(run_ermitwepp_short_climate, state, spatial_severity, k, cli_truncated_fn, selected_dates)
            for spatial_severity in spatial_severities for k in range(5)
        ]
        for future in as_completed(futures):
            sed_events = future.result()
            sed_results.extend(sed_events)

    # sort sed_results by sed_del_kg_m2 descending
    sed_results = sorted(sed_results, key=lambda x: x['sed_del_kg_m2'], reverse=True)
    
    sed_results_fn = _join(cwd, f'e_{_hash}.sed.json')
    with open(sed_results_fn, 'w') as fp:
        json.dump(sed_results, fp, indent=2)
    
    with ThreadPoolExecutor() as executor:
        future_probabilities = executor.submit(get_probabilities, state.ermit_pars.burn_severity, is_moonsoonal, spatial_severities, selected_years, sed_results)
        future_summary = executor.submit(parse_wepp_soil_output, output_fn, return_period_measures = ['runoff_from_rain+snow_mm'])
        future_ebe_events = executor.submit(get_annual_maxima_events_from_ebe, ebe_fn, cli_fn)

        probabilities, sed_deliviveries_kg_m2 = future_probabilities.result()
        summary = future_summary.result()
        ebe_events = future_ebe_events.result()
        
    del summary['annuals']
    
    return {
        'summary': summary, 
        'ebe_events': ebe_events, 
        'selected_dates': [f"{d['month']}/{d['day']}/{d['year']}" for d in selected_dates], 
        'sed_results': sed_results, 
        'probabilities': probabilities
        }


example_pars = {
    "ermit_pars": {
        "top_slope_pct": 1.0,
        "middle_slope_pct": 50.0,
        "bottom_slope_pct": 30.0,
        "length_m": 91,
        "soil_texture": "clay",
        "rfg_pct": 5,
        "vegetation_type": "Forest",
        "burn_severity": "High"
    },
    "climate": {
        "par_id": "ID106152",
        "input_years": 100,
        "cligen_version": "4.3"
    }
}

@router.post("/ermit/GET/slope/{spatial_severity}")
def ermit_get_slope(spatial_severity: str, state: ErmitState = Body(
        ...,
        example=example_pars
    )
):
    try:
        slope_file = create_slope_file(spatial_severity, state)
        contents = open(slope_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    
@router.post("/ermit/GET/soil/{spatial_severity}/{k}")
def ermit_get_soil(spatial_severity: str, k:int, state: ErmitState = Body(
        ...,
        example=example_pars
    )
):
    try:
        soil_file = create_soil_file(spatial_severity, k, state)
        contents = open(soil_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    
@router.post("/ermit/GET/management/{spatial_severity}")
def ermit_get_management(spatial_severity: str, state: ErmitState = Body(
        ...,
        example=example_pars
    )
):
    try:
        man_file_path = get_management_file(spatial_severity, state)
        contents = open(man_file_path).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/ermit/RUN/wepp")
def ermit_run_wepp(
    request: Request, 
    state: ErmitState = Body(
        ...,
        example=example_pars
    )
):
    results = run_ermitwepp(state)
    log_run(ip=request.client.host, model="ermit")
    return JSONResponse(content=results)

import os
from os.path import join as _join
from os.path import split as _split
from os.path import exists as _exists

from datetime import datetime

import shutil

import yaml

import enum
import math

import numpy as np

from fastapi import APIRouter, Query, Response, Request, HTTPException, Body
from typing import Optional
from pydantic import BaseModel

from .rockclim import ClimatePars
from .shared_models import SoilTexture
from .wepp import parse_wepp_soil_output
from .logger import log_run

router = APIRouter()

_thisdir = os.path.dirname(os.path.abspath(__file__))

management_data_dir = _join(_thisdir, 'db/disturbed/datatahoebasin')


class LanduseType(enum.Enum):
    OldForest = "OldForest"
    YoungForest = "YoungForest"
    Shrub = "Shrub"
    Bunchgrass = "Bunchgrass"
    Sod = "Sod"
    LowFire = "LowFire"
    HighFire = "HighFire"
    Skid = "Skid"
    
    __str__ = lambda self: self.value
    __hash__ = lambda self: hash(self.value)


class DisturbedOFE(BaseModel):
    landuse: LanduseType
    slope_point1_pct: float
    slope_point2_pct: float
    length_ft: Optional[float] = None
    length_m: Optional[float] = None
    cover_pct: float
    rfg_pct: float
    
    @property
    def slope_point1(self):
        return self.slope_point1_pct / 100.0
    
    @property
    def slope_point2(self):
        return self.slope_point2_pct / 100.0
    
    def __setattr__(self, key, value):
        super().__setattr__(key, value)
        
        if key == "length_ft" and value is not None:
            super().__setattr__("length_m", value * 0.3048)
        elif key == "length_m" and value is not None:
            super().__setattr__("length_ft", value / 0.3048)
            
    def __hash__(self):
        return hash((self.landuse, self.slope_point1_pct, self.slope_point2_pct, self.length_ft, self.cover_pct, self.rfg_pct))
    
    
class DisturbedWeppPars(BaseModel):
    soil_texture: SoilTexture
    upper_ofe: DisturbedOFE
    lower_ofe: DisturbedOFE
    width_m: float = 90.0
    
    def __hash__(self):
        return hash((self.soil_texture, self.upper_ofe, self.lower_ofe, self.width_m))
    
    def __setattr__(self, key, value):
        super().__setattr__(key, value)
        
        if key == "width_ft" and value is not None:
            super().__setattr__("width_m", value * 0.3048)
        elif key == "width_m" and value is not None:
            super().__setattr__("width_ft", value / 0.3048)
            

class DisturbedWeppState(BaseModel):
    climate: ClimatePars
    disturbedwepp_pars: DisturbedWeppPars
    wepp_version: str = "wepp2010"
    
    def __hash__(self):
        return hash((self.climate, self.disturbedwepp_pars, self.wepp_version))
    
    
soil_db_file = _join(_thisdir, "db/disturbed/soildb2014.yaml")

def create_soil_file(state: DisturbedWeppState) -> str:
    global soil_db_file
    
    _hash = hash(state.disturbedwepp_pars)
    new_soil_file = f"/ramdisk/disturbed/wd_{_hash}.sol"
    
    if _exists(new_soil_file):
        return new_soil_file
    
    os.makedirs(os.path.dirname(new_soil_file), exist_ok=True)
    
    # Load the soil database from the YAML file
    with open(soil_db_file, 'r') as file:
        soil_db = yaml.safe_load(file)

    with open(new_soil_file, 'w') as sol_fh:
        # Write header with soil version
        sol_fh.write(f"97.3\n"
                        "#\n"
                        "#      MoscowFSL::FSWEPP::FsWeppUtils::CreateSoilFile\n"
                        "#      Numbers by: Bill Elliot (USFS)\n"
                        "#\n"
                        "2014 Disturbed WEPP database\n"
                        " 2    1\n")

        # Function to process the soil data
        def process_soil_data(soil_texture: SoilTexture, ofe: DisturbedOFE, soil_db, sol_fh):
            
            # Fetch the soil data from the YAML file
            soil_data = soil_db.get(str(soil_texture), {}).get(str(ofe.landuse))
            if not (soil_data and isinstance(soil_data, list)):
                raise ValueError(f"Soil data not found for soil: {soil_texture}, treatment: {ofe.landuse}")

            meta_line, data_line = soil_data

            # Replace {rfg} with the rock value
            data_line = data_line.replace("{rfg}", str(ofe.rfg_pct))

            # Write the formatted lines to the soil file
            sol_fh.write(f"{meta_line}\n")
            sol_fh.write(f"{data_line}\n")

        # Process the upper ofe
        process_soil_data(
            state.disturbedwepp_pars.soil_texture, 
            state.disturbedwepp_pars.upper_ofe, soil_db, sol_fh)

        # Process the lower ofe
        process_soil_data(
            state.disturbedwepp_pars.soil_texture, 
            state.disturbedwepp_pars.lower_ofe, soil_db, sol_fh)

    return new_soil_file


def create_management_file(state: DisturbedWeppState):
    global management_data_dir
    
    _hash = hash(state)
    man_file = f'/ramdisk/disturbed/wd_{_hash}.man'
    
    if _exists(man_file):
        return man_file
    
    os.makedirs(os.path.dirname(man_file), exist_ok=True)
   
    version = str(datetime.now())
    years2sim = state.climate.input_years
    treat1 = state.disturbedwepp_pars.upper_ofe.landuse
    treat2 = state.disturbedwepp_pars.lower_ofe.landuse
    ofe1_pcover = state.disturbedwepp_pars.upper_ofe.cover_pct
    ofe2_pcover = state.disturbedwepp_pars.lower_ofe.cover_pct
  
    with open(man_file, 'w') as man_fh:
        # Write the header
        man_fh.write(f"""\
98.4
#
#\tCreated for Disturbed WEPP by wd.pl (v. {version})
#\tNumbers by: Bill Elliot (USFS) et alia
#

2\t# number of OFEs
{years2sim}\t# (total) years in simulation

#################
# Plant Section #
#################

2\t# looper; number of Plant scenarios {treat1}.plt {treat2}.plt

""")

        # Helper function to read and write files
        def write_scenario_file(file_path, output_fh):
            with open(file_path, 'r') as f:
                for line in f:
                    output_fh.write(line)

        # Write plant scenarios for treat1 and treat2
        write_scenario_file(_join(management_data_dir, f"{treat1}.plt"), man_fh)
        man_fh.write("\n")
        write_scenario_file(_join(management_data_dir, f"{treat2}.plt"), man_fh)

        # Write operation section
        man_fh.write(f"""
#####################
# Operation Section #
#####################

2\t# looper; number of Operation scenarios {treat1}.op {treat2}.op

""")

        # Write operation files for treat1 and treat2
        write_scenario_file(_join(management_data_dir, f"{treat1}.op"), man_fh)
        man_fh.write("\n")
        write_scenario_file(_join(management_data_dir, f"{treat2}.op"), man_fh)

        # Write initial conditions section
        man_fh.write(f"""
##############################
# Initial Conditions Section #
##############################

2\t# looper; number of Initial Conditions scenarios {treat1}.ini {treat2}.ini

""")

        # Helper function to process initial conditions
        def process_initial_conditions(treat, pcover, output_fh):
            inrcov = str(round(pcover / 100.0, 2))
            rilcov = str(inrcov)
            pcoverf = f"{pcover / 100:.7f}"

            with open(_join(management_data_dir, f"{treat}.ini"), 'r') as ic_file:
                for line in ic_file:
                    output_fh.write(line.replace('inrcov', inrcov)
                                        .replace('rilcov', rilcov)
                                        .replace('pcover', pcoverf))

        # Process initial conditions for treat1 and treat2
        process_initial_conditions(treat1, ofe1_pcover, man_fh)
        man_fh.write("\n")
        process_initial_conditions(treat2, ofe2_pcover, man_fh)

        # Write remaining sections
        man_fh.write(f"""
###########################
# Surface Effects Section #
###########################

2\t# Number of Surface Effects Scenarios

#
#   Surface Effects Scenario 1 of 2
#
Year 1
From WEPP database
USFS RMRS Moscow

1\t# landuse  - cropland
1\t# ntill - number of operations
  2\t# mdate  --- 1 / 2
  1\t# op --- Tah_****
      0.010\t# depth
      2\t# type

#
#   Surface Effects Scenario 2 of 2
#
Year 2
From WEPP database
USFS RMRS Moscow

1\t# landuse  - cropland
1\t# ntill - number of operations
  2\t# mdate  --- 1 / 2
  2\t# op --- Tah_****
      0.010\t# depth
      2\t# type

######################
# Contouring Section #
######################

0\t# looper; number of Contouring scenarios

####################
# Drainage Section #
####################

0\t# looper; number of Drainage scenarios

##################
# Yearly Section #
##################

2\t# looper; number of Yearly Scenarios

#
# Yearly scenario 1 of 2
#
Year 1



1\t# landuse <cropland>
1\t# plant growth scenario
1\t# surface effect scenario
0\t# contour scenario
0\t# drainage scenario
2\t# management <perennial>
   250\t# senescence date
   0\t# perennial plant date --- 0 /0
   0\t# perennial stop growth date --- 0/0
   0.0000\t# row width
   3\t# neither cut or grazed

#
# Yearly scenario 2 of 2
#
Year 2



1\t# landuse <cropland>
2\t# plant growth scenario
2\t# surface effect scenario
0\t# contour scenario
0\t# drainage scenario
2\t# management <perennial>
   250\t# senescence date
   0\t# perennial plant date --- 0 /0
   0\t# perennial stop growth date --- 0/0
   0.0000\t# row width
   3\t# neither cut or grazed

######################
# Management Section #
######################
Disturbed WEPP Model
Two OFEs for forest conditions
W. Elliot 02/99

2\t# `nofe' - <number of Overland Flow Elements>
\t1\t# `Initial Conditions indx' - <{treat1}>
\t2\t# `Initial Conditions indx' - <{treat2}>
{years2sim}\t# `nrots' - <rotation repeats..>
1\t# `nyears' - <years in rotation>
""")

        for i in range(1, years2sim + 1):
            man_fh.write(f"""\
#
#       Rotation {i} : year {i} to {i}
#
\t1\t# `nycrop' - <plants/yr; Year of Rotation :  {i} - OFE : 1>
\t\t1\t# `YEAR indx' - <{treat1}>

\t1\t# `nycrop' - <plants/yr; Year of Rotation :  {i} - OFE : 2>
\t\t2\t# `YEAR indx' - <{treat2}>
""")

    return man_file
            

def create_slope_file(state: DisturbedWeppState) -> str:
    _hash = hash(state.disturbedwepp_pars)
    slope_file = f"/ramdisk/disturbed/wd_{_hash}.slp"
    
    if _exists(slope_file):
        return slope_file
    
    os.makedirs(os.path.dirname(slope_file), exist_ok=True)

    ofe_width = state.disturbedwepp_pars.width_m
    top_slope1 = state.disturbedwepp_pars.upper_ofe.slope_point1
    mid_slope1 = state.disturbedwepp_pars.upper_ofe.slope_point2
    mid_slope2 = state.disturbedwepp_pars.lower_ofe.slope_point1
    bot_slope2 = state.disturbedwepp_pars.lower_ofe.slope_point2
    avg_slope = (mid_slope1 + mid_slope2) / 2
    
    ofe1_length = state.disturbedwepp_pars.upper_ofe.length_m
    ofe2_length = state.disturbedwepp_pars.lower_ofe.length_m

    # Counteract calculation difficulties in WEPP if slope is unchanging.
    # Adding a small fuzz value to avoid WEPP errors if slopes are too similar.
    slope_fuzz = 0.001
    if abs(mid_slope1 - mid_slope2) < slope_fuzz:
        mid_slope2 += 0.01

    try:
        with open(slope_file, 'w') as slope_fh:
            # Write header information
            slope_fh.write("97.3\n")  # datver
            slope_fh.write("#\n# Slope file generated for FSWEPP\n#\n")
            slope_fh.write("2\n")  # no. OFE
            slope_fh.write(f"100 {ofe_width}\n")  # aspect; representative profile width

            # OFE 1 (upper)
            slope_fh.write(f"3  {ofe1_length:.2f}\n")  # no. points, length
            slope_fh.write(f" {0:.2f}, {top_slope1:.3f}  ")  # dx, gradient
            slope_fh.write(f"{0.5:.2f}, {mid_slope1:.3f}  ")  # dx, gradient
            slope_fh.write(f"{1:.2f}, {avg_slope:.3f}\n")  # dx, gradient

            # OFE 2 (lower)
            slope_fh.write(f"3  {ofe2_length:.2f}\n")  # no. points, length
            slope_fh.write(f" {0:.2f}, {avg_slope:.3f}  ")  # dx, gradient
            slope_fh.write(f"{0.5:.2f}, {mid_slope2:.3f}  ")  # dx, gradient
            slope_fh.write(f"{1:.2f}, {bot_slope2:.3f}\n")  # dx, gradient

    except IOError as e:
        raise RuntimeError(f"Cannot open or write to file {slope_file}: {e}")

    return slope_file

            
def run_disturbedwepp(state: DisturbedWeppPars):
    
    import subprocess
    from .rockclim import get_climate
    
    cwd = '/ramdisk/disturbed'
    
    slope_fn = create_slope_file(state)
    _slope_fn = _split(slope_fn)[1]
    
    soil_fn = create_soil_file(state)
    _soil_fn = _split(soil_fn)[1]
    
    man_fn = create_management_file(state)
    _man_fn = _split(man_fn)[1]
    
    cli_fn = get_climate(state.climate)
    
    _hash = hash(state)
    run_fn = _join(cwd, f'wd_{_hash}.run')
    output_fn = _join(cwd, f'wd_{_hash}.dat')
    _output_fn = _split(output_fn)[1]
    
    stout_fn = _join(cwd, f'wd_{_hash}.stout')
    sterr_fn = _join(cwd, f'wd_{_hash}.sterr')
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
        "n",  # event-by-event out?
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
        raise Exception(wepp_stout)
        return {"error": "WEPP run was not successful"}

    return output_fn


example_pars = {
    "disturbedwepp_pars": {
        "soil_texture": "clay",
        "upper_ofe": {
            "landuse": "OldForest",
            "slope_point1_pct": 0,
            "slope_point2_pct": 30,
            "length_m": 100,
            "cover_pct": 80,
            "rfg_pct": 20
        },
        "lower_ofe": {
            "landuse": "HighFire",
            "slope_point1_pct": 32,
            "slope_point2_pct": 5,
            "length_m": 200,
            "cover_pct": 10,
            "rfg_pct": 20
        },
        "length_m": 90
    },
    "climate": {
        "par_id": "WA459074",
        "input_years": 100
    }
}
    
@router.post("/disturbed/GET/soil")
def disturbed_get_soil(state: DisturbedWeppState = Body(
        ...,

        example=example_pars
    )
):
    try:
        soil_file_path = create_soil_file(state)
        contents = open(soil_file_path).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as e:
        return {"error": str(e)}
    except FileNotFoundError as e:
        return {"error": str(e)}
    

@router.post("/disturbed/GET/management")
def disturbed_get_management(state: DisturbedWeppState = Body(
        ...,
        example=example_pars
    )
):
    try:
        man_file_path = create_management_file(state)
        contents = open(man_file_path).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as e:
        return {"error": str(e)}
    except FileNotFoundError as e:
        return {"error": str(e)}
    

@router.post("/disturbed/GET/slope")
def disturbed_get_slope(state: DisturbedWeppState = Body(
        ...,
        example=example_pars
    )
):
    try:
        slope_file = create_slope_file(state)
        contents = open(slope_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as e:
        return {"error": str(e)}
    except FileNotFoundError as e:
        return {"error": str(e)}
    
    
@router.post("/disturbedwepp/RUN/wepp")
def disturbed_run_wepp(
    request: Request, 
    state: DisturbedWeppState = Body(
        ...,
        example=example_pars
    )
):
    output_fn = run_disturbedwepp(state)
    log_run(ip=request.client.host, model="disturbed")
    slope_length = state.disturbedwepp_pars.upper_ofe.length_m + state.disturbedwepp_pars.lower_ofe.length_m
    return parse_wepp_soil_output(output_fn, slope_length=slope_length)


@router.post("/disturbedwepp/GET/wepp_output")
def disturbed_get_wepp_output(state: DisturbedWeppState = Body(
        ...,
        example=example_pars
    )
):
    output_fn = run_disturbedwepp(state)
    contents = open(output_fn).read()
    return Response(content=contents, media_type="application/text")
    



    
#curl -s https://api.github.com/repos/wepp-in-the-woods/fswepp-docker/contents/var/www/cgi-bin/fswepp/wd/datatahoebasin | grep '"name":' | grep '.plt' | awk -F '"' '{print $4}' | while read filename; do wget "https://raw.githubusercontent.com/wepp-in-the-woods/fswepp-docker/main/var/www/cgi-bin/fswepp/wd/datatahoebasin/$filename"; done
#curl -s https://api.github.com/repos/wepp-in-the-woods/fswepp-docker/contents/var/www/cgi-bin/fswepp/wd/datatahoebasin | grep '"name":' | grep '.op' | awk -F '"' '{print $4}' | while read filename; do wget "https://raw.githubusercontent.com/wepp-in-the-woods/fswepp-docker/main/var/www/cgi-bin/fswepp/wd/datatahoebasin/$filename"; done
#curl -s https://api.github.com/repos/wepp-in-the-woods/fswepp-docker/contents/var/www/cgi-bin/fswepp/wd/datatahoebasin | grep '"name":' | grep '.ini' | awk -F '"' '{print $4}' | while read filename; do wget "https://raw.githubusercontent.com/wepp-in-the-woods/fswepp-docker/main/var/www/cgi-bin/fswepp/wd/datatahoebasin/$filename"; done
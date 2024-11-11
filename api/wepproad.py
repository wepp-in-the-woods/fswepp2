import os
from os.path import join as _join
from os.path import split as _split
import shutil

import enum
import math

from fastapi import APIRouter, Query, Response, Request, HTTPException, Body
from typing import Optional
from pydantic import BaseModel

from .rockclim import ClimatePars

router = APIRouter()

_thisdir = os.path.dirname(os.path.abspath(__file__))

soil_data_dir = _join(_thisdir, 'db/wepproad/soils')
management_data_dir = _join(_thisdir, 'db/wepproad/managements')


class RoadDesign(enum.Enum):
    INVEG = 'inveg'
    OUTUNRUT = 'outunrut'
    OUTRUT = 'outrut'
    INBARE = 'inbare'

    __str__ = lambda self: self.value
    
    __hash__ = lambda self: hash(self.value)


class RoadSurface(enum.Enum):
    GRAVEL = 'gravel'
    PAVED = 'paved'
    
    __str__ = lambda self: self.value
    
    __hash__ = lambda self: hash(self.value)


class SoilTexture(enum.Enum):
    CLAY = 'clay'
    SILT = 'silt'
    SAND = 'sand'
    LOAM = 'loam'
    
    __str__ = lambda self: self.value
    
    __hash__ = lambda self: hash(self.value)


class TrafficLevel(enum.Enum):
    HIGH = 'high'
    LOW = 'low'
    NONE = 'none'
    
    __str__ = lambda self: self.value

    __hash__ = lambda self: hash(self.value)
    
    
class Road(BaseModel):
    slope_pct: float
    length_ft: Optional[float] = None
    length_m: Optional[float] = None
    width_ft: Optional[float] = None
    width_m: Optional[float] = None
    surface: RoadSurface
    design: RoadDesign
    traffic: TrafficLevel
    
    @property
    def outslope(self):
        return 0.04
    
    @property
    def slope(self):
        if self.design == RoadDesign.OUTUNRUT:
            return self.outslope**2.0 + (self.slope_pct / 100.0)**2.0
        else:    
            return self.slope_pct / 100.0
            
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
            
    @property
    def sim_length_m(self):
        if self.design == RoadDesign.OUTUNRUT:
            return self.length_m * self.slope / self.outslope
        else:
            return self.length_m
        
    @property
    def sim_width_m(self):
        if self.design == RoadDesign.OUTUNRUT:
            return self.width_m / (self.slope / self.outslope)
        else:
            return self.width_m
    
    def __hash__(self):
        return hash((self.slope_pct, self.length_m, self.width_m, self.surface, self.design, self.traffic))
    
    
class Fill(BaseModel):
    slope_pct: float
    length_ft: Optional[float] = None
    length_m: Optional[float] = None

    @property
    def slope(self):
        return self.slope_pct / 100.0
    
    def __setattr__(self, key, value):
        super().__setattr__(key, value)
        
        if key == "length_ft" and value is not None:
            super().__setattr__("length_m", value * 0.3048)
        elif key == "length_m" and value is not None:
            super().__setattr__("length_ft", value / 0.3048)
            
    def __hash__(self):
        return hash((self.slope_pct, self.length_ft))
    
    
class Buffer(BaseModel):
    slope_pct: float
    length_ft: Optional[float] = None
    length_m: Optional[float] = None
    
    @property
    def slope(self):
        return self.slope_pct / 100.0
    
    def __setattr__(self, key, value):
        super().__setattr__(key, value)
        
        if key == "length_ft" and value is not None:
            super().__setattr__("length_m", value * 0.3048)
        elif key == "length_m" and value is not None:
            super().__setattr__("length_ft", value / 0.3048)
            
    def __hash__(self):
        return hash((self.slope_pct, self.length_ft))


class WepproadPars(BaseModel):
    soil_texture: SoilTexture
    rfg_pct: float = 20
    road: Road
    fill: Fill
    buffer: Buffer
    
    def __hash__(self):
        return hash((self.soil_texture, self.road, self.fill, self.buffer))


class WeppRoadState(BaseModel):
    climate: ClimatePars
    wepproad_pars: WepproadPars
    
    def __hash__(self):
        return hash((self.climate, self.wepproad_pars))
    

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
    if road_design == RoadDesign.INVEG:
        tau_c = '10'
    elif road_design == RoadDesign.INBARE and surf == 'p':
        tau_c = '1'

    # Construct soil file name
    soil_file = f"3{surf}{soil_texture}{tau_c}.sol"
    soil_file_path = os.path.join(soil_data_dir, soil_file)

    # Check if soil file exists
    if not os.path.exists(soil_file_path):
        raise FileNotFoundError(f"Soil file {soil_file_path} does not exist")

    return soil_file_path


def create_soil_file(state: WeppRoadState):
    
    soil_file_template_path = get_soil_file_template(state)
    
    _hash = hash(state.wepproad_pars)
    new_soil_file = f"/ramdisk/wepproad/wr_{_hash}.sol"
    surface = state.wepproad_pars.road.surface
    traffic = state.wepproad_pars.road.traffic
    ubr = state.wepproad_pars.rfg_pct
    
    urr_ref, ufr_ref = None, None
 
    if not os.path.exists(soil_file_template_path):
        raise FileNotFoundError(f"Soil file {soil_file_template_path} does not exist")

    if os.path.exists(new_soil_file):
        return new_soil_file
    
    os.makedirs(os.path.dirname(new_soil_file), exist_ok=True)
    
    with open(soil_file_template_path, 'r') as soil_file, open(new_soil_file, 'w') as new_soil:
        if surface == RoadSurface.GRAVEL:
            urr_ref = 65.0
            ufr_ref = (ubr + 65.0) / 2.0
        elif surface == RoadSurface.PAVED:
            urr_ref = 95
            ufr_ref = (ubr + 65.0) / 2.0
        else:
            urr_ref = ubr
            ufr_ref = ubr

        # Modify 'Kr' and 'Ki' for 'no traffic' and 'low traffic'
        if traffic != TrafficLevel.HIGH:
            new_soil.write(soil_file.readline())  # line 1; version control number - datver
            new_soil.write(soil_file.readline())  # line 2; first comment line
            line = soil_file.readline()
            while line.startswith('#'):
                new_soil.write(line)
                line = soil_file.readline()
            new_soil.write(line)  # line 3: ntemp, ksflag
            line = soil_file.readline()
            pos1 = line.find("'")
            pos2 = line.find("'", pos1 + 1)
            pos3 = line.find("'", pos2 + 1)
            pos4 = line.find("'", pos3 + 1)
            slid_texid = line[:pos4 + 1]  # slid; texid
            rest = line[pos4 + 1:]
            nsl, salb, sat, ki, kr, shcrit, avke = rest.split()
            kr = float(kr) / 4
            ki = float(ki) / 4
            new_soil.write(f"{slid_texid}\t{nsl}\t{salb}\t{sat}\t{ki:.2f}\t{kr:.2f}\t{shcrit}\t{avke}\n")
        
        for line in soil_file:
            if 'urr' in line:
                ind = line.index('urr')
                left = line[:ind]
                right = line[ind + 3:]
                line = f"{left}{urr_ref}{right}"
            elif 'ufr' in line:
                ind = line.index('ufr')
                left = line[:ind]
                right = line[ind + 3:]
                line = f"{left}{ufr_ref}{right}"
            elif 'ubr' in line:
                ind = line.index('ubr')
                left = line[:ind]
                right = line[ind + 3:]
                line = f"{left}{ubr}{right}"
            new_soil.write(line)

    if not os.path.exists(new_soil_file):
        raise FileNotFoundError(f"Soil file {new_soil_file} does not exist")

    return new_soil_file


def get_management_file(state: WeppRoadState):
    road_design = state.wepproad_pars.road.design
    traffic = state.wepproad_pars.road.traffic

    man_file = ''
    if road_design == RoadDesign.INVEG:
        man_file = '3inslope.man'
    elif road_design == RoadDesign.OUTUNRUT:
        man_file = '3outunr.man'
    elif road_design == RoadDesign.OUTRUT:
        man_file = '3outrut.man'
    elif road_design == RoadDesign.INBARE:
        man_file = '3inslope.man'

    if traffic == TrafficLevel.NONE:
        if man_file == '3inslope.man':
            man_file = '3inslopen.man'
        elif man_file == '3outunr.man':
            man_file = '3outunrn.man'
        elif man_file == '3outrut.man':
            man_file = '3outrutn.man'

    man_file_path = os.path.join(management_data_dir, man_file)

    if not os.path.exists(man_file_path):
        raise FileNotFoundError(f"I can't open file {man_file_path}")

    return man_file_path


def create_slope_file(state: WeppRoadState):
    units = 'ft'

    # Validate units
    if units not in ('m', 'ft'):
        raise ValueError("Invalid units: must be 'm' or 'ft'")

    _hash = hash(state.wepproad_pars)
    slope_file = f"/ramdisk/wepproad/wr_{_hash}.slp"
    
    if os.path.exists(slope_file):
        return slope_file
    
    os.makedirs(os.path.dirname(slope_file), exist_ok=True)
    
    wepp_road_width = state.wepproad_pars.road.sim_width_m
    wepp_road_length = state.wepproad_pars.road.sim_length_m
    wepp_road_slope = state.wepproad_pars.road.slope
    wepp_fill_length = state.wepproad_pars.fill.length_m
    wepp_fill_slope = state.wepproad_pars.fill.slope
    wepp_buff_length = state.wepproad_pars.buffer.length_m
    wepp_buff_slope = state.wepproad_pars.buffer.slope
    
    with open(slope_file, "w") as slope_f:
        slope_f.write("97.3\n")  # datver
        slope_f.write(f"# Slope file for {_hash} by WEPP:Road Interface\n")
        slope_f.write("3\n")  # no. OFE
        slope_f.write(f"100 {wepp_road_width}\n")  # aspect; profile width

        # OFE 1 (road)
        slope_f.write(f"2  {wepp_road_length:.2f}\n")
        slope_f.write(f"0.00, {wepp_road_slope:.2f}  1.00, {wepp_road_slope:.2f}\n")

        # OFE 2 (fill)
        slope_f.write(f"3  {wepp_fill_length:.2f}\n")
        slope_f.write(f"0.00, {wepp_road_slope:.2f}  0.05, {wepp_fill_slope:.2f}  1.00, {wepp_fill_slope:.2f}\n")

        # OFE 3 (buffer)
        slope_f.write(f"3  {wepp_buff_length:.2f}\n")
        slope_f.write(f"0.00, {wepp_fill_slope:.2f}  0.05, {wepp_buff_slope:.2f}  1.00, {wepp_buff_slope:.2f}\n")

    return slope_file

def parse_wepp_results(output_file: str, state: WeppRoadState):
    storms, rainevents, snowevents, precip, rro, sro, syr, syp = None, None, None, None, None, None, None, None
    
    # Parse output file for additional information
    with open(output_file, 'r') as wepp_out:
        for line in wepp_out:
            if 'VERSION' in line:
                weppver = line.strip()
                break

        for line in wepp_out:
            if 'RAINFALL AND RUNOFF SUMMARY' in line:
                for _ in range(4+1):
                    line = wepp_out.readline()
                storms = line[1:10].strip()
                line = wepp_out.readline()
                rainevents = line[1:10].strip()
                line = wepp_out.readline()
                snowevents = line[1:10].strip()
                for _ in range(5+1):
                    line = wepp_out.readline()
                precip = line[51:61].strip()
                line = wepp_out.readline()
                rro = line[51:61].strip()
                line = wepp_out.readline()
#                line = wepp_out.readline()
                sro = line[51:61].strip()
                break

        for line in wepp_out:
            if 'AREA OF NET SOIL LOSS' in line:
                for _ in range(10):
                    line = wepp_out.readline()
                print(line)
                syr = line[17:24].strip() # soil loss MEAN (kg/m2)
                syr = float(syr)
                road_length_exhibiting_soil_loss_m = line[9:18].strip() # Area of Net Loss (m)
                road_length_exhibiting_soil_loss_m = float(road_length_exhibiting_soil_loss_m)
                break

        for line in wepp_out:
            if 'OFF SITE EFFECTS' in line:
                for _ in range(4+1):
                    line = wepp_out.readline()
                syp = float(line.split()[0])
                break

    road_width = state.wepproad_pars.road.sim_width_m
    road_prism_erosion_kg = syr * road_width * road_length_exhibiting_soil_loss_m

    sediment_leaving_buffer_kg = syp * road_width

    return {
        'weppver': weppver,
        'storms': int(storms),
        'rainevents': int(rainevents),
        'snowevents': int(snowevents),
        'precip_mm ': float(precip),
        'runoff_from_rain_mm': float(rro),
        'runoff_from_snow_mm': float(sro),
        'sim_width_m': road_width,
        'road_prism_erosion_kg': road_prism_erosion_kg,
        'sediment_leaving_buffer_kg': sediment_leaving_buffer_kg,
        'road_length_exhibiting_soil_loss_m': road_length_exhibiting_soil_loss_m
    }

example_pars = {
    "wepproad_pars": {
        "soil_texture": "clay",
        "rfg_pct": 20,
        "road": {
        "slope_pct": 30,
        "length_m": 200,
        "width_m": 3,
        "surface": "gravel",
        "design": "inveg",
        "traffic": "high"
        },
        "fill": {
        "slope_pct": 15,
        "length_m": 10
        },
        "buffer": {
        "slope_pct": 10,
        "length_m": 100
        }
    },
    "climate": {
        "par_id": "WA459074",
        "input_years": 100
    }
}

@router.post("/wepproad/GET/soil")
def get_soil(state: WeppRoadState = Body(
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
    

@router.post("/wepproad/GET/management")
def get_management(state: WeppRoadState = Body(
        ...,
        example=example_pars
    )
):
    try:
        soil_file_path = get_management_file(state)
        contents = open(soil_file_path).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as e:
        return {"error": str(e)}
    except FileNotFoundError as e:
        return {"error": str(e)}
    
    
@router.post("/wepproad/GET/slope")
def get_slope(state: WeppRoadState = Body(
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
    

def run_wepproad(state: WeppRoadState):
    
    from .rockclim import get_climate
    slope_fn = create_slope_file(state)
    _slope_fn = _split(slope_fn)[1]
    
    soil_fn = create_soil_file(state)
    _soil_fn = _split(soil_fn)[1]
    
    man_fn = get_management_file(state)
    _man_fn = _split(man_fn)[1]
    
    shutil.copyfile(man_fn, f'/ramdisk/wepproad/{_man_fn}')
    
    cli_fn = get_climate(state.climate)
    
    _hash = hash(state)
    run_fn = f'/ramdisk/wepproad/wr_{_hash}.run'
    output_fn = f'/ramdisk/wepproad/wr_{_hash}.dat'
    _output_fn = _split(output_fn)[1]
    
    stout_fn = f'/ramdisk/wepproad/wr_{_hash}.stout'
    sterr_fn = f'/ramdisk/wepproad/wr_{_hash}.sterr'
    content = [
        "m",  # english or metric
        "y",  # not watershed
        "1",  # 1 = continuous
        "1",  # 1 = hillslope
        "n",  # hillslope pass file out?
        "1",  # 1 = abbreviated annual out
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
        
    weppversion = '/usr/lib/python3/dist-packages/wepppy2/wepp_runner/bin/wepp2010'
    import subprocess

    command = f"{weppversion} <{run_fn} >{stout_fn} 2>{sterr_fn}"
    try:
        subprocess.run(command, shell=True, check=True, cwd='/ramdisk/wepproad')
    except subprocess.CalledProcessError as e:
        return {"error": str(e)}
    
    successful = False
    with open(stout_fn, 'r') as wepp_stout:
        for line in wepp_stout:
            if 'SUCCESSFUL' in line:
                successful = True
                break
    
    if not successful:
        return {"error": "WEPP run was not successful"}

    return output_fn


@router.post("/wepproad/RUN/wepp")
def run_wepp_road(state: WeppRoadState = Body(
        ...,
        example=example_pars
    )
):
    output_fn = run_wepproad(state)
    return parse_wepp_results(output_fn, state)


@router.post("/wepproad/GET/wepp_output")
def get_wepp_output(state: WeppRoadState = Body(
        ...,
        example=example_pars
    )
):
    output_fn = run_wepproad(state)
    contents = open(output_fn).read()
    return Response(content=contents, media_type="application/text")
    


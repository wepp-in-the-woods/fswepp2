import math
import os
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException, Request, Response
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, field_validator, model_validator

from .file_utils import atomic_write
from .frost_utils import FROST_DEFAULTS, ensure_frost_file
from .disturbed import TMP_BASE as DISTURBED_TMP_BASE
from .wepproad import TMP_BASE as WEPPROAD_TMP_BASE
from .hash_utils import stable_hash
from .logger import log_run
from .rockclim import ClimatePars
from .shared_models import SoilTexture
from .wepp import parse_wepp_soil_output

from .disturbed import (
    DisturbedOFE,
    DisturbedWeppPars,
    DisturbedWeppState,
    LanduseType,
    create_management_file as disturbed_create_management_file,
    create_run_file as disturbed_create_run_file,
    create_slope_file as disturbed_create_slope_file,
    create_soil_file as disturbed_create_soil_file,
    run_disturbedwepp,
    _output_path_for_state as _disturbed_output_path,
)
from .wepproad import (
    Buffer,
    Fill,
    Road,
    RoadDesign,
    RoadSurface,
    TrafficLevel,
    WeppRoadState,
    WepproadPars,
    run_wepproad,
    write_run_file as wepproad_write_run_file,
    _output_path_for_state as _wepproad_output_path,
)

router = APIRouter()

_thisdir = os.path.dirname(os.path.abspath(__file__))
# tmpfs path required by security policy
TMP_BASE = "/dev/shm/fume"  # nosec B108

FEET_TO_M = 0.3048
LB_PER_KG = 2.2046
KG_PER_TON = 907.18474
M2_PER_MI2 = 1609.344 ** 2
TON_MI2_TO_KG_M2 = KG_PER_TON / M2_PER_MI2
MI_PER_MI2_TO_KM_PER_KM2 = 1.0 / 1.609344
KM_PER_KM2_TO_MI_PER_MI2 = 1.0 / MI_PER_MI2_TO_KM_PER_KM2

TOTAL_LENGTH_MIN_M = 1.1 * FEET_TO_M
TOTAL_LENGTH_MAX_M = 1500.0 * FEET_TO_M
BUFFER_LENGTH_MIN_M = 1.0 * FEET_TO_M
BUFFER_LENGTH_MAX_M = 1000.0 * FEET_TO_M

ROAD_DENSITY_MIN_KM_PER_KM2 = 0.0
ROAD_DENSITY_MAX_KM_PER_KM2 = 20.0 * MI_PER_MI2_TO_KM_PER_KM2
ROAD_DENSITY_SKIP_THRESHOLD_KM_PER_KM2 = 0.001 * MI_PER_MI2_TO_KM_PER_KM2

DISTURBED_WIDTH_M = 90.0
ROAD_LENGTH_M = 300.0 * FEET_TO_M
ROAD_WIDTH_M = 13.0 * FEET_TO_M

T_PER_HA_TO_T_PER_AC = 0.445
ACRES_PER_MI2 = 640.0


def _round_half_up(value: float, ndigits: int) -> float:
    if value is None or not math.isfinite(value):
        return value
    if ndigits < 0:
        raise ValueError("ndigits must be >= 0")
    if ndigits == 0:
        return float(int(Decimal(str(value)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)))
    quant = Decimal("0." + "0" * (ndigits - 1) + "1")
    return float(Decimal(str(value)).quantize(quant, rounding=ROUND_HALF_UP))


def _short_hash(value, length: int = 12) -> str:
    return stable_hash(value)[:length]


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _cap_years(input_years: Optional[int]) -> int:
    if input_years is None:
        return 100
    return int(min(input_years, 100))


def _ton_mi2_to_kg_m2(value: float) -> float:
    return value * TON_MI2_TO_KG_M2


def _ton_mi2_range_to_si(value_range: Optional[Dict[str, float]]) -> Optional[Dict[str, float]]:
    if value_range is None:
        return None
    return {
        "min": _ton_mi2_to_kg_m2(value_range["min"]),
        "max": _ton_mi2_to_kg_m2(value_range["max"]),
    }


def _coerce_buffer_length(total_length_m: float, buffer_length_m: float) -> float:
    if buffer_length_m < total_length_m:
        return buffer_length_m
    coerced = total_length_m - (0.1 * FEET_TO_M)
    if coerced < BUFFER_LENGTH_MIN_M:
        coerced = BUFFER_LENGTH_MIN_M
    return coerced


def _road_density_mi_per_mi2(road_density_km_per_km2: float) -> float:
    return road_density_km_per_km2 * KM_PER_KM2_TO_MI_PER_MI2


class FumePars(BaseModel):
    soil_texture: SoilTexture
    total_length_m: float
    buffer_length_m: float
    top_slope_pct: float
    mid_slope_pct: float
    bottom_slope_pct: float
    wildfire_cycle_years: int
    rx_fire_cycle_years: int
    thinning_cycle_years: int
    road_density_km_per_km2: float

    @field_validator("total_length_m")
    def validate_total_length_m(cls, value):
        if value < TOTAL_LENGTH_MIN_M or value > TOTAL_LENGTH_MAX_M:
            raise ValueError(
                f"total_length_m must be between {TOTAL_LENGTH_MIN_M:.4f} and {TOTAL_LENGTH_MAX_M:.1f}"
            )
        return value

    @field_validator("buffer_length_m")
    def validate_buffer_length_m(cls, value):
        if value < BUFFER_LENGTH_MIN_M or value > BUFFER_LENGTH_MAX_M:
            raise ValueError(
                f"buffer_length_m must be between {BUFFER_LENGTH_MIN_M:.4f} and {BUFFER_LENGTH_MAX_M:.1f}"
            )
        return value

    @field_validator("top_slope_pct", "mid_slope_pct", "bottom_slope_pct")
    def validate_slope_pct(cls, value):
        if value < 0 or value > 1000:
            raise ValueError("Slope percentages must be between 0 and 1000")
        return value

    @field_validator("wildfire_cycle_years")
    def validate_wildfire_cycle_years(cls, value):
        if value < 1 or value > 400:
            raise ValueError("wildfire_cycle_years must be between 1 and 400")
        return value

    @field_validator("rx_fire_cycle_years")
    def validate_rx_fire_cycle_years(cls, value):
        if value < 1 or value > 200:
            raise ValueError("rx_fire_cycle_years must be between 1 and 200")
        return value

    @field_validator("thinning_cycle_years")
    def validate_thinning_cycle_years(cls, value):
        if value < 1 or value > 200:
            raise ValueError("thinning_cycle_years must be between 1 and 200")
        return value

    @field_validator("road_density_km_per_km2")
    def validate_road_density(cls, value):
        if value < ROAD_DENSITY_MIN_KM_PER_KM2 or value > ROAD_DENSITY_MAX_KM_PER_KM2:
            raise ValueError(
                f"road_density_km_per_km2 must be between {ROAD_DENSITY_MIN_KM_PER_KM2} and {ROAD_DENSITY_MAX_KM_PER_KM2:.4f}"
            )
        return value

    @model_validator(mode="after")
    def enforce_buffer_less_than_total(self):
        if self.buffer_length_m >= self.total_length_m:
            self.buffer_length_m = _coerce_buffer_length(self.total_length_m, self.buffer_length_m)
        ofe1_length_m = self.total_length_m - self.buffer_length_m
        ofe2_length_m = self.buffer_length_m
        if ofe1_length_m < 0 or ofe1_length_m > 3000:
            raise ValueError("ofe1_length_m must be between 0 and 3000")
        if ofe2_length_m < 0 or ofe2_length_m > 3000:
            raise ValueError("ofe2_length_m must be between 0 and 3000")
        return self

    @property
    def ofe1_length_m(self) -> float:
        return self.total_length_m - self.buffer_length_m

    @property
    def ofe2_length_m(self) -> float:
        return self.buffer_length_m

    @property
    def slope_length_m(self) -> float:
        return self.total_length_m

    def __hash__(self):
        return hash(
            (
                self.soil_texture,
                self.total_length_m,
                self.buffer_length_m,
                self.top_slope_pct,
                self.mid_slope_pct,
                self.bottom_slope_pct,
                self.wildfire_cycle_years,
                self.rx_fire_cycle_years,
                self.thinning_cycle_years,
                self.road_density_km_per_km2,
            )
        )


class FumeState(BaseModel):
    climate: ClimatePars
    fume_pars: FumePars
    wepp_version: str = "wepp2010"

    def __hash__(self):
        return hash((self.climate, self.fume_pars, self.wepp_version))


class DisturbedScenarioRequest(FumeState):
    scenario_id: str


class RoadScenarioRequest(FumeState):
    road_scenario_id: str


DISTURBED_SCENARIOS = [
    {
        "id": "undisturbed",
        "label": "Undisturbed forest",
        "upper_treatment": LanduseType.OldForest,
        "lower_treatment": LanduseType.OldForest,
        "upper_cover_pct": 100,
        "lower_cover_pct": 100,
    },
    {
        "id": "thinned",
        "label": "Thinned forest",
        "upper_treatment": LanduseType.YoungForest,
        "lower_treatment": LanduseType.OldForest,
        "upper_cover_pct": 85,
        "lower_cover_pct": 100,
    },
    {
        "id": "prescribed_fire",
        "label": "Prescribed burn",
        "upper_treatment": LanduseType.LowFire,
        "lower_treatment": LanduseType.OldForest,
        "upper_cover_pct": 85,
        "lower_cover_pct": 100,
    },
    {
        "id": "wildfire",
        "label": "Wildfire",
        "upper_treatment": LanduseType.HighFire,
        "lower_treatment": LanduseType.HighFire,
        "upper_cover_pct": 30,
        "lower_cover_pct": 40,
    },
    {
        "id": "lower_thinning",
        "label": "Lower thinning",
        "upper_treatment": LanduseType.YoungForest,
        "lower_treatment": LanduseType.OldForest,
        "upper_cover_pct": 95,
        "lower_cover_pct": 100,
    },
    {
        "id": "higher_rx_fire",
        "label": "Higher Rx fire",
        "upper_treatment": LanduseType.LowFire,
        "lower_treatment": LanduseType.LowFire,
        "upper_cover_pct": 75,
        "lower_cover_pct": 85,
    },
    {
        "id": "lower_rx_fire",
        "label": "Lower Rx fire",
        "upper_treatment": LanduseType.LowFire,
        "lower_treatment": LanduseType.OldForest,
        "upper_cover_pct": 90,
        "lower_cover_pct": 100,
    },
    {
        "id": "moderate_wildfire",
        "label": "Moderate wildfire",
        "upper_treatment": LanduseType.LowFire,
        "lower_treatment": LanduseType.LowFire,
        "upper_cover_pct": 50,
        "lower_cover_pct": 60,
    },
    {
        "id": "low_wildfire",
        "label": "Low wildfire",
        "upper_treatment": LanduseType.LowFire,
        "lower_treatment": LanduseType.LowFire,
        "upper_cover_pct": 70,
        "lower_cover_pct": 80,
    },
]

ROAD_SCENARIOS = [
    {
        "id": "no_traffic",
        "label": "No traffic",
        "design": RoadDesign.INVEG,
        "surface": RoadSurface.NATIVE,
        "traffic": TrafficLevel.NONE,
    },
    {
        "id": "low_traffic",
        "label": "Low traffic",
        "design": RoadDesign.INVEG,
        "surface": RoadSurface.NATIVE,
        "traffic": TrafficLevel.LOW,
    },
    {
        "id": "high_traffic",
        "label": "High traffic",
        "design": RoadDesign.OUTRUT,
        "surface": RoadSurface.GRAVELED,
        "traffic": TrafficLevel.HIGH,
    },
]

DISTURBED_SCENARIO_LOOKUP = {scenario["id"]: scenario for scenario in DISTURBED_SCENARIOS}
ROAD_SCENARIO_LOOKUP = {scenario["id"]: scenario for scenario in ROAD_SCENARIOS}


def _scenario_or_404(scenario_id: str) -> dict:
    scenario = DISTURBED_SCENARIO_LOOKUP.get(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Unknown disturbed scenario_id '{scenario_id}'")
    return scenario


def _road_scenario_or_404(scenario_id: str) -> dict:
    scenario = ROAD_SCENARIO_LOOKUP.get(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Unknown road_scenario_id '{scenario_id}'")
    return scenario


def _effective_climate(state: FumeState) -> ClimatePars:
    years2sim = _cap_years(state.climate.input_years)
    return state.climate.model_copy(update={"input_years": years2sim})


def _disturbed_state_for_scenario(state: FumeState, scenario: dict) -> DisturbedWeppState:
    pars = state.fume_pars
    climate = _effective_climate(state)

    upper = DisturbedOFE(
        landuse=scenario["upper_treatment"],
        slope_point1_pct=pars.top_slope_pct,
        slope_point2_pct=pars.mid_slope_pct,
        length_m=pars.ofe1_length_m,
        cover_pct=scenario["upper_cover_pct"],
        rfg_pct=20,
    )
    lower = DisturbedOFE(
        landuse=scenario["lower_treatment"],
        slope_point1_pct=pars.mid_slope_pct,
        slope_point2_pct=pars.bottom_slope_pct,
        length_m=pars.ofe2_length_m,
        cover_pct=scenario["lower_cover_pct"],
        rfg_pct=20,
    )

    slope_length_m = pars.slope_length_m
    ofe_area_ha = DISTURBED_WIDTH_M * slope_length_m / 10000.0
    ofe_width_m = ofe_area_ha * 10000.0 / slope_length_m

    disturbed_pars = DisturbedWeppPars(
        soil_texture=pars.soil_texture,
        upper_ofe=upper,
        lower_ofe=lower,
        width_m=ofe_width_m,
    )

    return DisturbedWeppState(
        climate=climate,
        disturbedwepp_pars=disturbed_pars,
        wepp_version=state.wepp_version,
    )


def _road_inputs(pars: FumePars) -> dict:
    road_slope_pct = pars.mid_slope_pct / 10.0
    fill_slope_pct = pars.mid_slope_pct * 2.0
    if fill_slope_pct > 150:
        fill_slope_pct = 150.0
    return {
        "road_length_m": ROAD_LENGTH_M,
        "road_width_m": ROAD_WIDTH_M,
        "road_slope_pct": road_slope_pct,
        "fill_length_m": ROAD_WIDTH_M,
        "fill_slope_pct": fill_slope_pct,
        "buffer_length_m": pars.buffer_length_m,
        "buffer_slope_pct": pars.bottom_slope_pct,
    }


def _validate_road_inputs(inputs: dict) -> None:
    errors = []
    if inputs["road_length_m"] < 3.0 * FEET_TO_M or inputs["road_length_m"] > 1000.0 * FEET_TO_M:
        errors.append("Road length must be between 0.9144 and 304.8 m")
    if inputs["road_slope_pct"] < 0.3 or inputs["road_slope_pct"] > 40:
        errors.append("Road gradient must be between 0.3 and 40 %")
    if inputs["road_width_m"] < 1.0 * FEET_TO_M or inputs["road_width_m"] > 300.0 * FEET_TO_M:
        errors.append("Road width must be between 0.3048 and 91.44 m")
    if inputs["fill_length_m"] < 1.0 * FEET_TO_M or inputs["fill_length_m"] > 300.0 * FEET_TO_M:
        errors.append("Fill length must be between 0.3048 and 91.44 m")
    if inputs["fill_slope_pct"] < 0.3:
        errors.append("Fill gradient must be greater than 0.3 %")
    if inputs["buffer_length_m"] < 1.0 * FEET_TO_M or inputs["buffer_length_m"] > 1000.0 * FEET_TO_M:
        errors.append("Buffer length must be between 0.3048 and 304.8 m")
    if inputs["buffer_slope_pct"] < 0.3 or inputs["buffer_slope_pct"] > 100:
        errors.append("Buffer gradient must be between 0.3 and 100 %")
    if errors:
        raise ValueError("; ".join(errors))


def _road_state_for_scenario(state: FumeState, scenario: dict) -> WeppRoadState:
    climate = _effective_climate(state)
    inputs = _road_inputs(state.fume_pars)

    road = Road.model_construct(
        slope_pct=inputs["road_slope_pct"],
        length_m=inputs["road_length_m"],
        width_m=inputs["road_width_m"],
        surface=scenario["surface"],
        design=scenario["design"],
        traffic=scenario["traffic"],
    )
    fill = Fill.model_construct(
        slope_pct=inputs["fill_slope_pct"],
        length_m=inputs["fill_length_m"],
    )
    buffer = Buffer.model_construct(
        slope_pct=inputs["buffer_slope_pct"],
        length_m=inputs["buffer_length_m"],
    )

    wepproad_pars = WepproadPars.model_construct(
        soil_texture=state.fume_pars.soil_texture,
        rfg_pct=20,
        road=road,
        fill=fill,
        buffer=buffer,
    )
    return WeppRoadState.model_construct(
        climate=climate,
        wepproad_pars=wepproad_pars,
        wepp_version=state.wepp_version,
    )


def _get_disturbed_output(state: DisturbedWeppState) -> str:
    ensure_frost_file(DISTURBED_TMP_BASE, FROST_DEFAULTS["disturbed"])
    output_fn = _disturbed_output_path(state)
    if not os.path.exists(output_fn):
        output_fn = run_disturbedwepp(state)
    return output_fn


def _get_wepproad_output(state: WeppRoadState) -> str:
    ensure_frost_file(WEPPROAD_TMP_BASE, FROST_DEFAULTS["wepproad"])
    output_fn = _wepproad_output_path(state)
    if not os.path.exists(output_fn):
        output_fn = run_wepproad(state)
    return output_fn


def _disturbed_run_result(state: DisturbedWeppState, slope_length_m: float) -> dict:
    output_fn = _get_disturbed_output(state)
    parsed = parse_wepp_soil_output(output_fn, slope_length=slope_length_m)
    annual = parsed.get("annual_averages", parsed)
    sediment_yield_kg_m2 = annual.get("sediment_yield_kg_m2")
    if sediment_yield_kg_m2 is None:
        raise ValueError("WEPP output missing sediment_yield_kg_m2")
    syp_kg_m = sediment_yield_kg_m2 * slope_length_m

    out_asypa = _round_half_up(sediment_yield_kg_m2 * 10.0 * T_PER_HA_TO_T_PER_AC, 2)
    ton_mi2 = out_asypa * ACRES_PER_MI2

    return {
        "sediment_yield_kg_m2": sediment_yield_kg_m2,
        "syp_kg_m": syp_kg_m,
        "ton_mi2": ton_mi2,
    }


def _wepproad_run_result(state: WeppRoadState, road_density_km_per_km2: float) -> dict:
    output_fn = _get_wepproad_output(state)
    road_width = state.wepproad_pars.road.sim_width_m
    parsed = parse_wepp_soil_output(output_fn, road_width=road_width)
    annual = parsed.get("annual_averages", parsed)

    syra_kg = annual.get("road_prism_erosion_kg")
    sypa_kg = annual.get("sediment_leaving_buffer_kg")
    effective_length_m = annual.get("road_length_exhibiting_soil_loss_m")
    if syra_kg is None or sypa_kg is None:
        raise ValueError("WEPP:Road output missing road sediment fields")

    syra_lb = syra_kg * LB_PER_KG
    sypa_lb = sypa_kg * LB_PER_KG
    road_density_mi = _road_density_mi_per_mi2(road_density_km_per_km2)

    z_syraf = _round_half_up(syra_lb * 0.0088 * road_density_mi, 1)
    z_sypaf = _round_half_up(sypa_lb * 0.0088 * road_density_mi, 1)

    return {
        "syra_kg": syra_kg,
        "sypa_kg": sypa_kg,
        "effective_road_length_m": effective_length_m,
        "road_ton_mi2": z_syraf,
        "buffer_ton_mi2": z_sypaf,
    }


def _compute_summary_and_analysis(
    disturbed_ton_mi2: Dict[str, float],
    cycles: Dict[str, int],
    road_ton_mi2: Dict[str, List[float]],
    road_enabled: bool,
) -> dict:
    undisturbe = disturbed_ton_mi2["undisturbed"]
    thinraw = disturbed_ton_mi2["thinned"]
    presraw = disturbed_ton_mi2["prescribed_fire"]
    wildraw = disturbed_ton_mi2["wildfire"]
    wildmodraw = disturbed_ton_mi2["moderate_wildfire"]

    thinning = _round_half_up(thinraw / cycles["thinning"], 1)
    prescribe = _round_half_up(presraw / cycles["rx_fire"], 1)
    wildfire = _round_half_up(wildraw / cycles["wildfire"], 1)

    notbackground = undisturbe + wildfire
    witbackground = thinning + prescribe

    withbperofnotb = "N/A"
    if notbackground > 0.001:
        withbperofnotb = _round_half_up(100 * witbackground / notbackground, 1)

    thinback = notbackground + thinning
    presback = notbackground + prescribe
    thinrx = notbackground + witbackground
    thinbackno = undisturbe + thinning
    presbackno = undisturbe + prescribe
    thinrxno = undisturbe + witbackground

    z_syraf = road_ton_mi2.get("road", [0.0, 0.0, 0.0])
    z_sypaf = road_ton_mi2.get("buffer", [0.0, 0.0, 0.0])

    if road_enabled:
        no_road_min = min(z_sypaf[0], z_syraf[0], z_sypaf[1], z_syraf[1])
        no_road_max = max(z_sypaf[0], z_syraf[0], z_sypaf[1], z_syraf[1])
        tr_road_min = min(z_sypaf[1], z_syraf[1], z_sypaf[2], z_syraf[2])
        tr_road_max = max(z_sypaf[1], z_syraf[1], z_sypaf[2], z_syraf[2])
    else:
        no_road_min = 0.0
        no_road_max = 0.0
        tr_road_min = 0.0
        tr_road_max = 0.0

    no_road_low = notbackground + no_road_min
    no_road_high = notbackground + no_road_max
    tr_road_low = thinrx + tr_road_min
    tr_road_high = thinrx + tr_road_max

    # Legacy fume2.pl uses $thin (undefined); numeric context yields 0.
    tr_thin_low = tr_road_min
    tr_thin_high = tr_road_max
    tr_thin_low1 = notbackground + thinning + tr_road_min
    tr_thin_high1 = notbackground + thinning + tr_road_max

    undiwild = undisturbe + wildfire

    def pct_or_na(value: float):
        if undiwild <= 0.001:
            return "N/A"
        return _round_half_up(value, 0)

    thin_over_back = pct_or_na(100 * (thinning) / undiwild)
    rx_over_back = pct_or_na(100 * (prescribe) / undiwild)
    no_low_over_back = pct_or_na(100 * (no_road_low - undiwild) / undiwild)
    no_high_over_back = pct_or_na(100 * (no_road_high - undiwild) / undiwild)
    tr_low_over_back = pct_or_na(100 * (tr_road_low - undiwild) / undiwild)
    tr_high_over_back = pct_or_na(100 * (tr_road_high - undiwild) / undiwild)
    tr_thin_low_over_back = pct_or_na(100 * (tr_thin_low - undiwild) / undiwild)
    tr_thin_high_over_back = pct_or_na(100 * (tr_thin_high - undiwild) / undiwild)
    tr_thin_low1_over_back = pct_or_na(100 * (tr_thin_low1 - undiwild) / undiwild)
    tr_thin_high1_over_back = pct_or_na(100 * (tr_thin_high1 - undiwild) / undiwild)

    rx_temp = notbackground + prescribe
    rx_low = rx_temp + no_road_min
    rx_high = rx_temp + no_road_max
    rx_low_over_back = pct_or_na(100 * (rx_low - undiwild) / undiwild)
    rx_high_over_back = pct_or_na(100 * (rx_high - undiwild) / undiwild)

    presraw_over_wildfire_cycle = None
    wildmodraw_over_wildfire_cycle = None
    if cycles["wildfire"] > 0.01:
        presraw_over_wildfire_cycle = _round_half_up(presraw / cycles["wildfire"], 2)
        wildmodraw_over_wildfire_cycle = _round_half_up(wildmodraw / cycles["wildfire"], 2)

    rx_temp = (presraw_over_wildfire_cycle or 0.0) + thinbackno + prescribe
    rx_wild_low = rx_temp + tr_road_min
    rx_wild_high = rx_temp + tr_road_max
    rx_wild_low_over_back = pct_or_na(-100 * (rx_wild_low - undiwild) / undiwild)
    rx_wild_high_over_back = pct_or_na(-100 * (rx_wild_high - undiwild) / undiwild)

    summary_table = [
        {
            "line": 1,
            "source": "Undisturbed forest",
            "year_of_disturbance_kg_m2": None,
            "return_period_years": 1,
            "average_annual_kg_m2_yr": _ton_mi2_to_kg_m2(undisturbe),
        },
        {
            "line": 2,
            "source": "Wildfire",
            "year_of_disturbance_kg_m2": _ton_mi2_to_kg_m2(wildraw),
            "return_period_years": cycles["wildfire"],
            "average_annual_kg_m2_yr": _ton_mi2_to_kg_m2(wildfire),
        },
        {
            "line": 3,
            "source": "Prescribed fire",
            "year_of_disturbance_kg_m2": _ton_mi2_to_kg_m2(presraw),
            "return_period_years": cycles["rx_fire"],
            "average_annual_kg_m2_yr": _ton_mi2_to_kg_m2(prescribe),
        },
        {
            "line": 4,
            "source": "Thinning",
            "year_of_disturbance_kg_m2": _ton_mi2_to_kg_m2(thinraw),
            "return_period_years": cycles["thinning"],
            "average_annual_kg_m2_yr": _ton_mi2_to_kg_m2(thinning),
        },
        {
            "line": 5,
            "source": "Low access roads",
            "year_of_disturbance_range_kg_m2": _ton_mi2_range_to_si(
                {"min": no_road_min, "max": no_road_max}
            ),
            "return_period_years": 1,
            "average_annual_range_kg_m2_yr": _ton_mi2_range_to_si(
                {"min": no_road_min, "max": no_road_max}
            ),
        },
        {
            "line": 6,
            "source": "High access roads",
            "year_of_disturbance_range_kg_m2": _ton_mi2_range_to_si(
                {"min": tr_road_min, "max": tr_road_max}
            ),
            "return_period_years": 1,
            "average_annual_range_kg_m2_yr": _ton_mi2_range_to_si(
                {"min": tr_road_min, "max": tr_road_max}
            ),
        },
    ]

    analysis = {
        "undisturbed_kg_m2_yr": _ton_mi2_to_kg_m2(undisturbe),
        "thinraw_kg_m2": _ton_mi2_to_kg_m2(thinraw),
        "presraw_kg_m2": _ton_mi2_to_kg_m2(presraw),
        "wildraw_kg_m2": _ton_mi2_to_kg_m2(wildraw),
        "wildmodraw_kg_m2": _ton_mi2_to_kg_m2(wildmodraw),
        "thinning_kg_m2_yr": _ton_mi2_to_kg_m2(thinning),
        "prescribe_kg_m2_yr": _ton_mi2_to_kg_m2(prescribe),
        "wildfire_kg_m2_yr": _ton_mi2_to_kg_m2(wildfire),
        "notbackground_kg_m2_yr": _ton_mi2_to_kg_m2(notbackground),
        "witbackground_kg_m2_yr": _ton_mi2_to_kg_m2(witbackground),
        "withbperofnotb_pct": withbperofnotb,
        "thinback_kg_m2_yr": _ton_mi2_to_kg_m2(thinback),
        "presback_kg_m2_yr": _ton_mi2_to_kg_m2(presback),
        "thinrx_kg_m2_yr": _ton_mi2_to_kg_m2(thinrx),
        "thinbackno_kg_m2_yr": _ton_mi2_to_kg_m2(thinbackno),
        "presbackno_kg_m2_yr": _ton_mi2_to_kg_m2(presbackno),
        "thinrxno_kg_m2_yr": _ton_mi2_to_kg_m2(thinrxno),
        "no_road_min_kg_m2_yr": _ton_mi2_to_kg_m2(no_road_min),
        "no_road_max_kg_m2_yr": _ton_mi2_to_kg_m2(no_road_max),
        "tr_road_min_kg_m2_yr": _ton_mi2_to_kg_m2(tr_road_min),
        "tr_road_max_kg_m2_yr": _ton_mi2_to_kg_m2(tr_road_max),
        "no_road_low_kg_m2_yr": _ton_mi2_to_kg_m2(no_road_low),
        "no_road_high_kg_m2_yr": _ton_mi2_to_kg_m2(no_road_high),
        "tr_road_low_kg_m2_yr": _ton_mi2_to_kg_m2(tr_road_low),
        "tr_road_high_kg_m2_yr": _ton_mi2_to_kg_m2(tr_road_high),
        "tr_thin_low_kg_m2_yr": _ton_mi2_to_kg_m2(tr_thin_low),
        "tr_thin_high_kg_m2_yr": _ton_mi2_to_kg_m2(tr_thin_high),
        "tr_thin_low1_kg_m2_yr": _ton_mi2_to_kg_m2(tr_thin_low1),
        "tr_thin_high1_kg_m2_yr": _ton_mi2_to_kg_m2(tr_thin_high1),
        "undiwild_kg_m2_yr": _ton_mi2_to_kg_m2(undiwild),
        "thin_over_back_pct": thin_over_back,
        "rx_over_back_pct": rx_over_back,
        "no_low_over_back_pct": no_low_over_back,
        "no_high_over_back_pct": no_high_over_back,
        "tr_low_over_back_pct": tr_low_over_back,
        "tr_high_over_back_pct": tr_high_over_back,
        "tr_thin_low_over_back_pct": tr_thin_low_over_back,
        "tr_thin_high_over_back_pct": tr_thin_high_over_back,
        "tr_thin_low1_over_back_pct": tr_thin_low1_over_back,
        "tr_thin_high1_over_back_pct": tr_thin_high1_over_back,
        "rx_low_kg_m2_yr": _ton_mi2_to_kg_m2(rx_low),
        "rx_high_kg_m2_yr": _ton_mi2_to_kg_m2(rx_high),
        "rx_low_over_back_pct": rx_low_over_back,
        "rx_high_over_back_pct": rx_high_over_back,
        "presraw_over_wildfire_cycle_kg_m2_yr": _ton_mi2_to_kg_m2(presraw_over_wildfire_cycle)
        if presraw_over_wildfire_cycle is not None
        else None,
        "wildmodraw_over_wildfire_cycle_kg_m2_yr": _ton_mi2_to_kg_m2(wildmodraw_over_wildfire_cycle)
        if wildmodraw_over_wildfire_cycle is not None
        else None,
        "rx_wild_low_kg_m2_yr": _ton_mi2_to_kg_m2(rx_wild_low),
        "rx_wild_high_kg_m2_yr": _ton_mi2_to_kg_m2(rx_wild_high),
        "rx_wild_low_over_back_pct": rx_wild_low_over_back,
        "rx_wild_high_over_back_pct": rx_wild_high_over_back,
    }

    return {
        "summary_table": summary_table,
        "analysis": analysis,
    }


def _cache_key_for_state(state: FumeState) -> dict:
    climate = _effective_climate(state)
    return {
        "cache_version": 1,
        "climate": climate,
        "fume_pars": state.fume_pars,
        "wepp_version": state.wepp_version,
    }


def _response_path_for_state(state: FumeState) -> str:
    hash_id = _short_hash(_cache_key_for_state(state))
    return os.path.join(TMP_BASE, f"fume_{hash_id}.json")


def _load_cached_response(state: FumeState) -> Optional[dict]:
    path = _response_path_for_state(state)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as handle:
            import json

            return json.load(handle)
    except Exception:
        return None


def _store_cached_response(state: FumeState, payload: dict) -> None:
    _ensure_dir(TMP_BASE)
    path = _response_path_for_state(state)
    import json

    encoded = jsonable_encoder(payload)
    with atomic_write(path, "w") as handle:
        json.dump(encoded, handle)


@router.post("/fume/RUN/wepp")
def fume_run_wepp(
    request: Request,
    state: FumeState = Body(...),
):
    cached = _load_cached_response(state)
    if cached is not None:
        return cached

    ensure_frost_file(TMP_BASE, FROST_DEFAULTS["fume"])

    pars = state.fume_pars
    climate = _effective_climate(state)
    years2sim = climate.input_years

    warnings = []
    if pars.top_slope_pct > 50 or pars.mid_slope_pct > 50 or pars.bottom_slope_pct > 50:
        warnings.append("Hillslopes with greater than 50% gradient may be prone to mass failure.")

    disturbed_runs = []
    disturbed_ton_mi2 = {}
    slope_length_m = pars.slope_length_m

    for scenario in DISTURBED_SCENARIOS:
        scenario_state = _disturbed_state_for_scenario(state, scenario)
        result = _disturbed_run_result(scenario_state, slope_length_m)
        disturbed_ton_mi2[scenario["id"]] = result["ton_mi2"]
        disturbed_runs.append(
            {
                "scenario_id": scenario["id"],
                "label": scenario["label"],
                "upper_treatment": str(scenario["upper_treatment"]),
                "lower_treatment": str(scenario["lower_treatment"]),
                "upper_cover_pct": scenario["upper_cover_pct"],
                "lower_cover_pct": scenario["lower_cover_pct"],
                "ofe1_length_m": pars.ofe1_length_m,
                "ofe2_length_m": pars.ofe2_length_m,
                "slope_length_m": slope_length_m,
                "syp_kg_m": result["syp_kg_m"],
                "sediment_yield_kg_m2_yr": result["sediment_yield_kg_m2"],
            }
        )

    road_density_km_per_km2 = pars.road_density_km_per_km2
    road_enabled = road_density_km_per_km2 >= ROAD_DENSITY_SKIP_THRESHOLD_KM_PER_KM2 and road_density_km_per_km2 > 0

    road_inputs = _road_inputs(pars)
    if road_enabled:
        try:
            _validate_road_inputs(road_inputs)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    wepproad_runs = []
    road_ton_mi2 = {"road": [0.0, 0.0, 0.0], "buffer": [0.0, 0.0, 0.0]}

    for idx, scenario in enumerate(ROAD_SCENARIOS):
        run_entry = {
            "road_scenario_id": scenario["id"],
            "label": scenario["label"],
            "inputs": {
                "road_length_m": road_inputs["road_length_m"],
                "road_width_m": road_inputs["road_width_m"],
                "road_slope_pct": road_inputs["road_slope_pct"],
                "fill_length_m": road_inputs["fill_length_m"],
                "fill_slope_pct": road_inputs["fill_slope_pct"],
                "buffer_length_m": road_inputs["buffer_length_m"],
                "buffer_slope_pct": road_inputs["buffer_slope_pct"],
                "surface": str(scenario["surface"]),
                "design": str(scenario["design"]),
                "traffic": str(scenario["traffic"]),
                "rfg_pct": 20,
            },
            "skipped": not road_enabled,
        }

        if road_enabled:
            scenario_state = _road_state_for_scenario(state, scenario)
            result = _wepproad_run_result(scenario_state, road_density_km_per_km2)
            road_ton_mi2["road"][idx] = result["road_ton_mi2"]
            road_ton_mi2["buffer"][idx] = result["buffer_ton_mi2"]
            run_entry.update(
                {
                    "effective_road_length_m": result["effective_road_length_m"],
                    "sediment_yield_road_kg_m2_yr": _ton_mi2_to_kg_m2(result["road_ton_mi2"]),
                    "sediment_yield_buffer_kg_m2_yr": _ton_mi2_to_kg_m2(result["buffer_ton_mi2"]),
                }
            )
        else:
            run_entry.update(
                {
                    "effective_road_length_m": None,
                    "sediment_yield_road_kg_m2_yr": 0.0,
                    "sediment_yield_buffer_kg_m2_yr": 0.0,
                }
            )

        wepproad_runs.append(run_entry)

    summary_and_analysis = _compute_summary_and_analysis(
        disturbed_ton_mi2,
        {
            "wildfire": pars.wildfire_cycle_years,
            "rx_fire": pars.rx_fire_cycle_years,
            "thinning": pars.thinning_cycle_years,
        },
        road_ton_mi2,
        road_enabled,
    )

    response_payload = {
        "inputs": {
            "climate": climate,
            "fume_pars": {
                "soil_texture": pars.soil_texture,
                "total_length_m": pars.total_length_m,
                "buffer_length_m": pars.buffer_length_m,
                "ofe1_length_m": pars.ofe1_length_m,
                "ofe2_length_m": pars.ofe2_length_m,
                "slope_length_m": pars.slope_length_m,
                "top_slope_pct": pars.top_slope_pct,
                "mid_slope_pct": pars.mid_slope_pct,
                "bottom_slope_pct": pars.bottom_slope_pct,
                "wildfire_cycle_years": pars.wildfire_cycle_years,
                "rx_fire_cycle_years": pars.rx_fire_cycle_years,
                "thinning_cycle_years": pars.thinning_cycle_years,
                "road_density_km_per_km2": pars.road_density_km_per_km2,
            },
            "years2sim": years2sim,
        },
        "disturbed_runs": disturbed_runs,
        "wepproad_runs": wepproad_runs,
        "summary_table": summary_and_analysis["summary_table"],
        "analysis": summary_and_analysis["analysis"],
        "warnings": warnings,
        "units": {
            "length": "m",
            "slope": "percent",
            "road_density": "km/km^2",
            "sediment_yield": "kg/m^2/yr",
        },
    }

    log_run(ip=request.client.host, model="fume")
    _store_cached_response(state, response_payload)
    return response_payload


@router.post("/fume/GET/disturbed/soil")
def fume_get_disturbed_soil(req: DisturbedScenarioRequest = Body(...)):
    scenario = _scenario_or_404(req.scenario_id)
    scenario_state = _disturbed_state_for_scenario(req, scenario)
    try:
        soil_file = disturbed_create_soil_file(scenario_state)
        contents = open(soil_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/fume/GET/disturbed/management")
def fume_get_disturbed_management(req: DisturbedScenarioRequest = Body(...)):
    scenario = _scenario_or_404(req.scenario_id)
    scenario_state = _disturbed_state_for_scenario(req, scenario)
    try:
        man_file = disturbed_create_management_file(scenario_state)
        contents = open(man_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/fume/GET/disturbed/slope")
def fume_get_disturbed_slope(req: DisturbedScenarioRequest = Body(...)):
    scenario = _scenario_or_404(req.scenario_id)
    scenario_state = _disturbed_state_for_scenario(req, scenario)
    try:
        slope_file = disturbed_create_slope_file(scenario_state)
        contents = open(slope_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/fume/GET/disturbed/run_file")
def fume_get_disturbed_run_file(req: DisturbedScenarioRequest = Body(...)):
    scenario = _scenario_or_404(req.scenario_id)
    scenario_state = _disturbed_state_for_scenario(req, scenario)
    try:
        run_file = disturbed_create_run_file(scenario_state)
        contents = open(run_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/fume/GET/disturbed/wepp_output")
def fume_get_disturbed_wepp_output(req: DisturbedScenarioRequest = Body(...)):
    scenario = _scenario_or_404(req.scenario_id)
    scenario_state = _disturbed_state_for_scenario(req, scenario)
    try:
        output_file = _get_disturbed_output(scenario_state)
        contents = open(output_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/fume/GET/wepproad/run_file")
def fume_get_wepproad_run_file(req: RoadScenarioRequest = Body(...)):
    scenario = _road_scenario_or_404(req.road_scenario_id)
    try:
        road_inputs = _road_inputs(req.fume_pars)
        _validate_road_inputs(road_inputs)
        scenario_state = _road_state_for_scenario(req, scenario)
        run_file = wepproad_write_run_file(scenario_state)
        contents = open(run_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/fume/GET/wepproad/wepp_output")
def fume_get_wepproad_wepp_output(req: RoadScenarioRequest = Body(...)):
    scenario = _road_scenario_or_404(req.road_scenario_id)
    try:
        road_inputs = _road_inputs(req.fume_pars)
        _validate_road_inputs(road_inputs)
        scenario_state = _road_state_for_scenario(req, scenario)
        output_file = _get_wepproad_output(scenario_state)
        contents = open(output_file).read()
        return Response(content=contents, media_type="application/text")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

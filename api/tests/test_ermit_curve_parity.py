from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import pytest

try:
    from api.ermit import (
        BurnSeverity,
        CLIMATE_PROBABILITIES,
        ErmitPars,
        ErmitState,
        VegetationType,
        _climate_weights_by_year,
        _select_runoff_years,
        get_probabilities,
        get_spatial_severities,
        run_ermitwepp_short_climate,
    )
    from api.rockclim import ClimatePars
    from api.shared_models import SoilTexture
    from api.wepp_runner import resolve_wepp_binary
except ImportError as exc:
    pytest.skip(f"Missing dependencies for ERMiT curve parity test: {exc}", allow_module_level=True)

ROOT = Path(__file__).resolve().parents[2]

TON_PER_ACRE_TO_KG_M2 = 907.18474 / 4046.8564224
TONNE_PER_HA_TO_KG_M2 = 0.1

CASE_DATA = {
    "denver_silt_high_forest": {
        "par_id": "CO052220",
        "soil": SoilTexture.SILT,
        "rfg_pct": 20.0,
        "veg": VegetationType.Forest,
        "burn": BurnSeverity.High,
        "top_slope_pct": 50.0,
        "middle_slope_pct": 50.0,
        "bottom_slope_pct": 50.0,
        "length_ft": 300.0,
    },
    "flagstaff_loam_unburned": {
        "par_id": "AZ023010",
        "soil": SoilTexture.LOAM,
        "rfg_pct": 20.0,
        "veg": VegetationType.Chaparral,
        "burn": BurnSeverity.Unburned,
        "top_slope_pct": 0.0,
        "middle_slope_pct": 50.0,
        "bottom_slope_pct": 30.0,
        "length_ft": 300.0,
        "user_shrub_pct": 80.0,
        "user_grass_pct": 0.0,
        "user_bare_pct": 20.0,
    },
}

TARGET_PROBABILITIES = (0.1, 0.2, 0.5, 0.8)


def _legacy_units_factor(unit_line: str) -> float:
    lower = unit_line.lower()
    if "ton" in lower and "ac" in lower:
        return TON_PER_ACRE_TO_KG_M2
    if "t" in lower and "ha" in lower:
        return TONNE_PER_HA_TO_KG_M2
    if "kg" in lower and "m2" in lower:
        return 1.0
    return 1.0


def _parse_gnudata(path: Path) -> dict:
    unit_factor = 1.0
    rows = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip():
            continue
        if line.lstrip().startswith("#"):
            if "Sediment Delivery" in line:
                unit_factor = _legacy_units_factor(line)
            continue
        parts = line.split()
        if len(parts) < 6:
            continue
        sed = float(parts[0]) * unit_factor
        probs = [float(value) / 100.0 for value in parts[1:6]]
        rows.append({"sed_del_kg_m2": sed, "probs": probs})
    return {"rows": rows, "unit_factor": unit_factor}


def _find_case_file(case_dir: Path, pattern: str) -> Path:
    matches = sorted(case_dir.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"Missing legacy file pattern {pattern} in {case_dir}")
    return matches[0]


def _find_cli_file(case_dir: Path) -> Path:
    matches = [path for path in case_dir.glob("wepp-*.cli") if not path.name.endswith("_.cli")]
    if not matches:
        raise FileNotFoundError(f"Missing legacy .cli file in {case_dir}")
    return sorted(matches)[0]


def _build_state(case_id: str) -> ErmitState:
    data = CASE_DATA[case_id]
    length_m = data["length_ft"] * 0.3048
    climate = ClimatePars(
        par_id=data["par_id"],
        database="legacy",
        input_years=100,
        cligen_version="4.31",
    )
    ermit_pars = ErmitPars(
        top_slope_pct=data["top_slope_pct"],
        middle_slope_pct=data["middle_slope_pct"],
        bottom_slope_pct=data["bottom_slope_pct"],
        length_m=length_m,
        soil_texture=data["soil"],
        rfg_pct=data["rfg_pct"],
        vegetation_type=data["veg"],
        burn_severity=data["burn"],
        user_shrub_pct=data.get("user_shrub_pct"),
        user_grass_pct=data.get("user_grass_pct"),
        user_bare_pct=data.get("user_bare_pct"),
    )
    return ErmitState(climate=climate, ermit_pars=ermit_pars, wepp_version="wepp2010")


def _compute_fswepp2_curve(case_id: str, tmp_path: Path):
    try:
        from api.cligen import ClimateFile
        from api.wepp import get_annual_maxima_events_from_ebe
    except ImportError as exc:
        pytest.skip(f"Missing dependencies for ERMiT curve parity test: {exc}")
    case_dir = ROOT / "parity-runs" / "ermit" / case_id / "legacy" / "working"
    event_path = _find_case_file(case_dir, "wepp-*.event100")
    cli_path = _find_cli_file(case_dir)

    annual = get_annual_maxima_events_from_ebe(str(event_path))
    years_to_run, selected_years_for_weights, selected_dates = _select_runoff_years(
        annual["annual_maxima_events"]
    )
    climate_weights_by_year = _climate_weights_by_year(
        selected_years_for_weights, CLIMATE_PROBABILITIES
    )

    climate_full = ClimateFile(str(cli_path))
    is_monsoonal = climate_full.is_monsoonal

    climate = ClimateFile(str(cli_path))
    climate.selected_years_filter(years_to_run)
    truncated_cli = tmp_path / f"{case_id}_selected.cli"
    climate.write(str(truncated_cli))

    state = _build_state(case_id)
    spatial_severities = get_spatial_severities(state.ermit_pars.burn_severity)

    sed_results = []
    with ThreadPoolExecutor() as executor:
        futures = [
            executor.submit(
                run_ermitwepp_short_climate,
                state,
                spatial_severity,
                k,
                str(truncated_cli),
                selected_dates,
                years_to_simulate=len(years_to_run),
            )
            for spatial_severity in spatial_severities
            for k in range(5)
        ]
        for future in as_completed(futures):
            sed_results.extend(future.result())

    sed_results = sorted(sed_results, key=lambda row: row["sed_del_kg_m2"], reverse=True)

    probabilities, _ = get_probabilities(
        state.ermit_pars.burn_severity,
        is_monsoonal,
        spatial_severities,
        climate_weights_by_year,
        sed_results,
    )

    return sed_results, probabilities


def _find_sed_at_prob_legacy(rows, year_index: int, target: float):
    for row in rows:
        if row["probs"][year_index] >= target:
            return row["sed_del_kg_m2"]
    return None


def _round_prob_legacy(prob: float) -> float:
    return float(f"{prob * 100:.2g}") / 100.0


def _find_sed_at_prob_fs(prob_list, sed_results, target: float):
    if not isinstance(prob_list, list) or len(prob_list) < 2:
        return None
    for idx in range(1, len(prob_list)):
        if _round_prob_legacy(prob_list[idx]) >= target:
            return sed_results[idx - 1]["sed_del_kg_m2"]
    return None


def _assert_close(case_id: str, target: float, legacy_val: float, fs_val: float):
    if legacy_val is None or fs_val is None:
        pytest.fail(
            f"Missing value for {case_id} at {target:.0%}: legacy={legacy_val} fswepp2={fs_val}"
        )
    abs_diff = abs(fs_val - legacy_val)
    rel_diff = abs_diff / max(abs(legacy_val), 1e-9)
    if abs_diff > 1e-3 and rel_diff > 0.01:
        pytest.fail(
            f"Curve mismatch for {case_id} at {target:.0%}: legacy={legacy_val:.6f} "
            f"fswepp2={fs_val:.6f} (Δ={fs_val-legacy_val:+.6f})"
        )


@pytest.mark.parametrize("case_id", ["denver_silt_high_forest", "flagstaff_loam_unburned"])
def test_ermit_curve_parity(case_id, tmp_path):
    try:
        resolve_wepp_binary("wepp2010")
    except Exception as exc:
        pytest.skip(f"WEPP binary not available: {exc}")

    case_dir = ROOT / "parity-runs" / "ermit" / case_id / "legacy" / "working"
    gnudata_path = _find_case_file(case_dir, "wepp-*.gnudata")
    legacy_rows = _parse_gnudata(gnudata_path)["rows"]

    sed_results, probabilities = _compute_fswepp2_curve(case_id, tmp_path)

    prob_list = probabilities["untreated"][0]
    for target in TARGET_PROBABILITIES:
        legacy_val = _find_sed_at_prob_legacy(legacy_rows, 0, target)
        fs_val = _find_sed_at_prob_fs(prob_list, sed_results, target)
        _assert_close(case_id, target, legacy_val, fs_val)

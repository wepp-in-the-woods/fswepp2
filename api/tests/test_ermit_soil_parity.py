import json
import os
import shlex
import shutil
import subprocess
from pathlib import Path

import pytest

from api.ermit import ErmitPars, ErmitState, VegetationType, BurnSeverity, create_soil_file
from api.rockclim import ClimatePars
from api.shared_models import SoilTexture

ROOT = Path(__file__).resolve().parents[2]
LEGACY_SCRIPT = ROOT / "scripts" / "legacy_ermit_soilfile.pl"
LEGACY_OUTPUTS_ENV = "LEGACY_ERMIT_SOIL_OUTPUTS"


def _parse_soil_file(contents: str):
    lines = []
    for raw in contents.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#"):
            continue
        lines.append(line)

    if len(lines) < 3:
        raise ValueError("Soil file missing required lines")

    version = float(lines[0])
    nofe, ksflag = lines[1].split()
    nofe = int(nofe)
    ksflag = int(ksflag)

    entries = []
    i = 2
    while i + 1 < len(lines):
        header = shlex.split(lines[i])
        values = lines[i + 1].split()
        if len(header) < 9:
            raise ValueError(f"Unexpected header line: {lines[i]}")
        if len(values) < 6:
            raise ValueError(f"Unexpected values line: {lines[i+1]}")

        entry = {
            "name": header[0],
            "soil_label": header[1],
            "nsl": int(header[2]),
            "salb": float(header[3]),
            "sat": float(header[4]),
            "ki": float(header[5]),
            "kr": float(header[6]),
            "tauc": float(header[7]),
            "ksat": float(header[8]),
            "solthk": float(values[0]),
            "sand": float(values[1]),
            "clay": float(values[2]),
            "orgmat": float(values[3]),
            "cec": float(values[4]),
            "rfg": float(values[5]),
        }
        entries.append(entry)
        i += 2

    entries.sort(key=lambda x: x["name"])
    return {"version": version, "nofe": nofe, "ksflag": ksflag, "entries": entries}


def _legacy_soil_batch(cases):
    outputs_path = os.getenv(LEGACY_OUTPUTS_ENV)
    if outputs_path:
        path = Path(outputs_path)
        if not path.exists():
            pytest.fail(f"Legacy outputs file not found: {path}")
        outputs = {}
        with path.open("r", encoding="utf-8") as handle:
            for raw in handle:
                line = raw.strip()
                if not line:
                    continue
                row = json.loads(line)
                key = (
                    str(row["s"]).lower(),
                    int(row["k"]),
                    str(row["soil"]).lower(),
                    int(round(float(row["rfg"]))),
                    str(row["vegtype"]).lower(),
                    round(float(row["shrub"]), 6),
                    round(float(row["grass"]), 6),
                    round(float(row["bare"]), 6),
                )
                outputs[key] = row
        ordered = []
        missing = []
        for (s, k, soil, rfg, veg, shrub, grass, bare) in cases:
            key = (
                str(s).lower(),
                int(k),
                str(soil).lower(),
                int(round(float(rfg))),
                str(veg).lower(),
                round(float(shrub), 6),
                round(float(grass), 6),
                round(float(bare), 6),
            )
            row = outputs.get(key)
            if row is None:
                missing.append(key)
                continue
            ordered.append(row)
        if missing:
            pytest.fail(f"Legacy outputs missing {len(missing)} cases (e.g., {missing[0]})")
        return ordered

    if not LEGACY_SCRIPT.exists():
        pytest.skip(f"Missing legacy generator: {LEGACY_SCRIPT}")

    if not shutil.which("perl"):
        pytest.skip("perl not available")

    payload = "\n".join(
        json.dumps(
            {
                "s": s,
                "k": k,
                "soil": soil,
                "rfg": rfg,
                "vegtype": veg,
                "shrub": shrub,
                "grass": grass,
                "bare": bare,
            }
        )
        for (s, k, soil, rfg, veg, shrub, grass, bare) in cases
    )
    if payload:
        payload += "\n"

    cmd = ["perl", str(LEGACY_SCRIPT), "--batch"]
    result = subprocess.run(cmd, input=payload, capture_output=True, text=True)
    if result.returncode != 0:
        pytest.fail(f"Legacy batch failed: {result.stderr.strip()}")

    outputs = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        outputs.append(json.loads(line))
    return outputs


def _fswepp2_soil_text(s, k, soil, rfg, vegtype, shrub=None, grass=None, bare=None):
    climate = ClimatePars(par_id="AL010831", database="legacy", input_years=100, cligen_version="4.31")

    soil_enum = {
        "sand": SoilTexture.SAND,
        "silt": SoilTexture.SILT,
        "clay": SoilTexture.CLAY,
        "loam": SoilTexture.LOAM,
    }[soil]

    veg_enum = {
        "forest": VegetationType.Forest,
        "range": VegetationType.Range,
        "chaparral": VegetationType.Chaparral,
    }[vegtype]

    ermit_pars = ErmitPars(
        top_slope_pct=0.0,
        middle_slope_pct=50.0,
        bottom_slope_pct=30.0,
        length_m=100.0,
        soil_texture=soil_enum,
        rfg_pct=float(rfg),
        vegetation_type=veg_enum,
        burn_severity=BurnSeverity.Low,
        user_shrub_pct=shrub,
        user_grass_pct=grass,
        user_bare_pct=bare,
    )

    state = ErmitState(climate=climate, ermit_pars=ermit_pars, wepp_version="wepp2010")
    path = create_soil_file(s, k, state)
    soil_path = Path(path)
    contents = soil_path.read_text(encoding="utf-8")
    soil_path.unlink(missing_ok=True)
    return contents


def _case_grid():
    vegtypes = ["forest", "range", "chaparral"]
    soils = ["sand", "silt", "clay", "loam"]
    severities = ["lll", "llh", "lhl", "lhh", "hll", "hlh", "hhl", "hhh", "uuu"]
    ks = [0, 1, 2, 3, 4]
    rfgs = list(range(5, 86))

    for veg in vegtypes:
        if veg == "forest":
            shrub = grass = bare = 0.0
        elif veg == "range":
            shrub, grass, bare = 15.0, 75.0, 10.0
        else:
            shrub, grass, bare = 80.0, 0.0, 20.0
        for soil in soils:
            for s in severities:
                for k in ks:
                    for rfg in rfgs:
                        yield (s, k, soil, rfg, veg, shrub, grass, bare)


def _compare_legacy_fswepp2(legacy, fswepp2, case_id):
    assert legacy["version"] == fswepp2["version"], case_id
    assert legacy["nofe"] == fswepp2["nofe"], case_id
    assert legacy["ksflag"] == fswepp2["ksflag"], case_id

    assert len(legacy["entries"]) == len(fswepp2["entries"])
    for l_entry, f_entry in zip(legacy["entries"], fswepp2["entries"]):
        assert l_entry["name"] == f_entry["name"], case_id
        assert l_entry["soil_label"] == f_entry["soil_label"], case_id
        assert l_entry["nsl"] == f_entry["nsl"], case_id
        assert l_entry["salb"] == pytest.approx(f_entry["salb"], rel=1e-9, abs=1e-9), case_id
        assert l_entry["sat"] == pytest.approx(f_entry["sat"], rel=1e-9, abs=1e-9), case_id
        assert l_entry["ki"] == pytest.approx(f_entry["ki"], rel=1e-9, abs=1e-9), case_id
        assert l_entry["kr"] == pytest.approx(f_entry["kr"], rel=1e-12, abs=1e-12), case_id
        assert l_entry["tauc"] == pytest.approx(f_entry["tauc"], rel=1e-9, abs=1e-9), case_id
        assert l_entry["ksat"] == pytest.approx(f_entry["ksat"], rel=1e-9, abs=1e-9), case_id
        assert l_entry["solthk"] == pytest.approx(f_entry["solthk"], rel=1e-9, abs=1e-9), case_id
        assert l_entry["sand"] == pytest.approx(f_entry["sand"], rel=1e-9, abs=1e-9), case_id
        assert l_entry["clay"] == pytest.approx(f_entry["clay"], rel=1e-9, abs=1e-9), case_id
        assert l_entry["orgmat"] == pytest.approx(f_entry["orgmat"], rel=1e-9, abs=1e-9), case_id
        assert l_entry["cec"] == pytest.approx(f_entry["cec"], rel=1e-9, abs=1e-9), case_id
        assert l_entry["rfg"] == pytest.approx(f_entry["rfg"], rel=1e-9, abs=1e-9), case_id


def test_ermit_soil_full_matrix():
    if os.getenv("RUN_ERMIT_SOIL_FULL") != "1":
        pytest.skip("Full ERMiT soil parity matrix disabled. Set RUN_ERMIT_SOIL_FULL=1 to run.")

    cases = list(_case_grid())
    legacy_rows = _legacy_soil_batch(cases)
    assert len(legacy_rows) == len(cases)

    for row in legacy_rows:
        case_id = (
            f"veg={row['vegtype']} soil={row['soil']} s={row['s']} "
            f"k={row['k']} rfg={row['rfg']}"
        )
        legacy_text = row["soil_text"]
        fswepp2_text = _fswepp2_soil_text(
            row["s"],
            int(row["k"]),
            row["soil"],
            float(row["rfg"]),
            row["vegtype"],
            float(row["shrub"]),
            float(row["grass"]),
            float(row["bare"]),
        )

        legacy = _parse_soil_file(legacy_text)
        fswepp2 = _parse_soil_file(fswepp2_text)

        _compare_legacy_fswepp2(legacy, fswepp2, case_id)

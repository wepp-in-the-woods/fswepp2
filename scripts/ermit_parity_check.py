#!/usr/bin/env python3
import argparse
import json
import math
import os
import re
import urllib.parse
from pathlib import Path

import yaml
import requests

TON_PER_ACRE_TO_KG_M2 = 907.18474 / 4046.8564224  # 0.224170...
TONNE_PER_HA_TO_KG_M2 = 0.1


def _extract_form_data(command: str) -> dict:
    match = re.search(r"--data\s+'([^']*)'", command, re.S)
    if not match:
        raise ValueError("Unable to find --data payload in curl command")
    payload = match.group(1)
    parsed = urllib.parse.parse_qs(payload, keep_blank_values=True)
    return {k: v[0] if v else "" for k, v in parsed.items()}


def _parse_climate_id(raw: str) -> str:
    decoded = urllib.parse.unquote(raw or "")
    base = os.path.basename(decoded)
    return base.upper()


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
        try:
            sed = float(parts[0]) * unit_factor
            probs = [float(p) / 100.0 for p in parts[1:6]]
        except ValueError:
            continue
        rows.append({"sed_del_kg_m2": sed, "probs": probs})
    return {"rows": rows, "unit_factor": unit_factor}


def _find_sed_at_prob_legacy(rows, year_index: int, target: float):
    for row in rows:
        if row["probs"][year_index] >= target:
            return row["sed_del_kg_m2"]
    return None


def _find_sed_at_prob(prob_list, sed_results, target: float):
    if not isinstance(prob_list, list) or len(prob_list) < 2:
        return None
    for i in range(1, len(prob_list)):
        if prob_list[i] >= target:
            return sed_results[i - 1].get("sed_del_kg_m2")
    return None


def _cli2pat(prcp=50, dur=2, tp=0.3, ip=4, max_time=(10, 30, 60)):
    if prcp == 0 or dur == 0:
        return [0.0 for _ in max_time]

    if tp <= 0.0:
        tp = 0.1

    def the_b(_b, _tp, _ip):
        return (_ip - _ip * math.exp(-_b * _tp)) / _tp

    im = prcp / dur
    max_time = [t / 60.0 for t in max_time]
    last_b = 15
    b = 10
    while abs(b - last_b) > 0.000001:
        last_b = b
        b = the_b(b, tp, ip)

    if tp == 1:
        tp = 0.999

    d = b * tp / (1 - tp)
    peaks = []
    for mt in max_time:
        t_start = tp - mt / dur
        t_high = tp
        t_low = t_start
        t_end = tp
        i_start = ip * math.exp(b * (t_start - tp))
        i_end = ip
        while abs(i_start - i_end) > 0.000001:
            if i_start < i_end:
                t_low = t_start
            else:
                t_high = t_start
            t_start = (t_high + t_low) / 2
            t_end = t_start + mt / dur
            i_start = ip * math.exp(b * (t_start - tp))
            i_end = ip * math.exp(d * (tp - t_end))

        if t_start < 0:
            t_start = 0
            t_end = 1

        dur_peak = t_end - t_start
        intensity = ((ip / b - ip / b * math.exp(b * (t_start - tp))) +
                     (ip / d - ip / d * math.exp(d * (tp - t_end)))) * \
            im / max(dur_peak, mt / dur)
        peaks.append(intensity)

    return peaks


def _parse_cli_map(cli_path: Path):
    lines = [line for line in cli_path.read_text(encoding="utf-8", errors="replace").splitlines() if line.strip()]
    header_idx = None
    for i, line in enumerate(lines):
        if line.strip().lower().startswith("da"):
            header_idx = i
            break
    if header_idx is None:
        return {}
    data_start = header_idx + 2
    records = {}
    for line in lines[data_start:]:
        parts = line.split()
        if len(parts) < 13:
            continue
        try:
            day = int(parts[0])
            month = int(parts[1])
            year = int(parts[2])
            prcp = float(parts[3])
            dur = float(parts[4])
            tp = float(parts[5])
            ip = float(parts[6])
        except ValueError:
            continue
        records[(year, month, day)] = {"prcp": prcp, "dur": dur, "tp": tp, "ip": ip}
    return records


def _parse_event_file(event_path: Path):
    rows = []
    for line in event_path.read_text(encoding="utf-8", errors="replace").splitlines()[3:]:
        line = re.sub(r"\s+", " ", line.strip())
        if not line:
            continue
        parts = line.split(" ")
        if len(parts) != 14:
            continue
        try:
            row = {
                "day": int(parts[0]),
                "month": int(parts[1]),
                "year": int(parts[2]),
                "precip_mm": float(parts[3]),
                "runoff_mm": float(parts[4]),
                "sed_del_kg_m": float(parts[12]),
            }
        except ValueError:
            continue
        rows.append(row)
    return rows


def _annual_maxima_events(event_rows, cli_map=None):
    by_year = {}
    for row in event_rows:
        yr = row["year"]
        if yr not in by_year or row["runoff_mm"] > by_year[yr]["runoff_mm"]:
            by_year[yr] = row
    events = list(by_year.values())
    events.sort(key=lambda x: x["runoff_mm"], reverse=True)
    for idx, event in enumerate(events, start=1):
        event["runoff_rank"] = idx
        if cli_map is not None:
            meta = cli_map.get((event["year"], event["month"], event["day"]))
            if meta:
                event["dur"] = meta["dur"]
                peaks = _cli2pat(prcp=meta["prcp"], dur=meta["dur"], tp=meta["tp"], ip=meta["ip"])
                event["10-min Peak Rainfall Intensity (mm/hour)"] = peaks[0]
                event["30-min Peak Rainfall Intensity (mm/hour)"] = peaks[1]
                event["60-min Peak Rainfall Intensity (mm/hour)"] = peaks[2]
    return {
        "annual_maxima_events": events,
        "runoff_year_ranks_descending": [e["year"] for e in events],
        "num_years_with_runoff_event": len(events),
    }


def _parse_wepp_annual_averages(out_path: Path):
    lines = out_path.read_text(encoding="utf-8", errors="replace").splitlines()
    start = 0
    for i, line in enumerate(lines):
        if "ANNUAL AVERAGE SUMMARIES" in line:
            start = i
            break
    lines = lines[start:]

    storms = rainevents = snowevents = precip = rro = sro = None
    for i, line in enumerate(lines):
        if "RAINFALL AND RUNOFF SUMMARY" in line:
            storms = lines[i + 5].split()[0]
            rainevents = lines[i + 6].split()[0]
            snowevents = lines[i + 7].split()[0]
            precip = lines[i + 14].split()[-2]
            rro = lines[i + 15].split()[-2]
            sro = lines[i + 17].split()[-2]
            break

    if storms is None:
        return None

    return {
        "storms": float(storms),
        "rainevents": float(rainevents),
        "snowevents": float(snowevents),
        "precip_mm": float(precip),
        "runoff_from_rain_mm": float(rro),
        "runoff_from_snow_mm": float(sro),
        "runoff_from_rain+snow_mm": float(rro) + float(sro),
    }


def _parse_legacy_case(case_dir: Path):
    working = case_dir / "legacy" / "working"
    out_files = sorted(working.glob("wepp-*.out"))
    event100_files = sorted(working.glob("wepp-*.event100"))
    cli_files = sorted([p for p in working.glob("wepp-*.cli") if not p.name.endswith("_.cli")])
    gnudata_files = sorted(working.glob("wepp-*.gnudata"))

    if not out_files:
        raise FileNotFoundError(f"No .out file found in {working}")
    out_file = out_files[0]

    summary = _parse_wepp_annual_averages(out_file)

    event_file = event100_files[0] if event100_files else None
    cli_file = cli_files[0] if cli_files else None
    events = None
    if event_file:
        cli_map = _parse_cli_map(cli_file) if cli_file else None
        event_rows = _parse_event_file(event_file)
        events = _annual_maxima_events(event_rows, cli_map=cli_map)

    gnudata = None
    if gnudata_files:
        gnudata = _parse_gnudata(gnudata_files[0])

    return {
        "annual_averages": summary,
        "events": events,
        "gnudata": gnudata,
        "files": {
            "out": str(out_file),
            "event100": str(event_file) if event_file else None,
            "cli": str(cli_file) if cli_file else None,
            "gnudata": str(gnudata_files[0]) if gnudata_files else None,
        },
    }


def _build_api_payload(form_data: dict):
    units = form_data.get("units", "m")
    length = float(form_data.get("length", 0) or 0)
    length_m = length * 0.3048 if units.lower().startswith("f") else length

    top = float(form_data.get("top_slope", 0) or 0)
    mid = float(form_data.get("avg_slope", 0) or 0)
    bot = float(form_data.get("toe_slope", 0) or 0)

    def clamp_slope(value):
        return value if value >= 0 else 0.0

    severity_map = {"h": "High", "m": "Moderate", "l": "Low", "u": "Unburned"}
    veg_map = {"forest": "Forest", "range": "Range", "chap": "Chaparral"}

    def to_float_or_none(value):
        if value is None or value == "":
            return None
        return float(value)

    payload = {
        "climate": {
            "database": "legacy",
            "par_id": _parse_climate_id(form_data.get("Climate")),
            "input_years": 100,
            "cligen_version": "4.31",
        },
        "ermit_pars": {
            "top_slope_pct": clamp_slope(top),
            "middle_slope_pct": clamp_slope(mid),
            "bottom_slope_pct": clamp_slope(bot),
            "length_m": length_m,
            "soil_texture": form_data.get("SoilType"),
            "rfg_pct": float(form_data.get("rfg", 0) or 0),
            "vegetation_type": veg_map.get(form_data.get("vegetation", ""), "Forest"),
            "burn_severity": severity_map.get(form_data.get("severity", ""), "Low"),
            "user_shrub_pct": to_float_or_none(form_data.get("pct_shrub")),
            "user_grass_pct": to_float_or_none(form_data.get("pct_grass")),
            "user_bare_pct": to_float_or_none(form_data.get("pct_bare")),
        },
        "wepp_version": "wepp2010",
    }

    if payload["ermit_pars"]["vegetation_type"] != "Forest":
        for key, field in [("pct_shrub", "user_shrub_pct"), ("pct_grass", "user_grass_pct"), ("pct_bare", "user_bare_pct")]:
            value = form_data.get(key)
            payload["ermit_pars"][field] = float(value) if value not in (None, "") else None

    return payload


def _call_api(base_url: str, payload: dict, timeout: int):
    url = base_url.rstrip("/") + "/api/ermit/RUN/wepp"
    response = requests.post(url, json=payload, timeout=timeout)
    response.raise_for_status()
    return response.json()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", required=True)
    parser.add_argument("--api-base", default="http://localhost:8090")
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    cases_path = Path(args.cases)
    data = yaml.safe_load(cases_path.read_text(encoding="utf-8"))
    cases = data.get("cases", [])

    results = []
    for case in cases:
        case_id = case["id"]
        command = case.get("legacy", {}).get("curl", [{}])[0].get("command", "")
        form_data = _extract_form_data(command)
        payload = _build_api_payload(form_data)

        case_dir = cases_path.parent / case_id
        legacy = _parse_legacy_case(case_dir)
        fswepp2 = _call_api(args.api_base, payload, args.timeout)

        results.append({
            "id": case_id,
            "payload": payload,
            "legacy": legacy,
            "fswepp2": fswepp2,
            "notes": {
                "top_slope_input": float(form_data.get("top_slope", 0) or 0),
                "top_slope_used": payload["ermit_pars"]["top_slope_pct"],
            }
        })

    output = {"cases": results}
    if args.out:
        Path(args.out).write_text(json.dumps(output, indent=2), encoding="utf-8")
    else:
        print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()

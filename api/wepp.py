from api.all_your_base.stats import weibull_series
import math
from typing import Optional

import pandas as pd
import re

from .cligen import ClimateFile


def calc_rec_intervals(annuals: dict, measure: str, rec_intervals=[1, 2, 5, 10]) -> dict:
    n_years = len(annuals)
    
    rec_ranks = weibull_series(rec_intervals, n_years, method='am')
    
    # order events in descending order
    events = sorted(annuals.values(), key=lambda x: x[measure], reverse=True)
    
    recs = {}
    for rec, rank in rec_ranks.items():
        recs[str(rec)] = events[rank]
        
    return recs

def parse_wepp_soil_output(
    output_file: str, 
    slope_length: Optional[float] = None, 
    road_width: Optional[float] = None, 
    rec_intervals=[1, 2, 5, 10],
    return_period_measures = ['precip_mm', 'runoff_from_rain+snow_mm', 'soil_loss_mean_kg_m2', 'sediment_yield_kg_m']) -> dict:
    
    storms, rainevents, snowevents, precip, rro, sro, syr, syp, sym = (
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
    )
    table_syr = None
    area_of_net_loss = None
    
    with open(output_file, 'r') as fp:
        wepp_out = fp.readlines()
        
        for line in wepp_out:
            if 'VERSION' in line:
                weppver = line.strip()
                break
            
        annuals = None
        return_periods = None
        if 'Annual; detailed' in wepp_out[0]:
            
            annual_breaks = []
            for i, line in enumerate(wepp_out):
                if line.startswith('     HILLSLOPE') and 'YEARLY SUMMARY' in line:
                    annual_breaks.append(i)
            annual_breaks.append(len(wepp_out))
                    
            annuals = {}
            
            for i in range(len(annual_breaks) - 1):
                i0 = annual_breaks[i]
                iend = annual_breaks[i + 1]
                
                _line = wepp_out[i0].split()
                hillslope = int(_line[1])
                year = int(_line[-1])
                
                for j in range(i0, iend):
                    if 'RAINFALL AND RUNOFF SUMMARY' in wepp_out[j]:
                        data = wepp_out[j+9].split()
                        storms = data[0]
                        precip = data[1]
                        rainevents = data[2]
                        rro = data[3]
                        snowevents = data[4]
                        sro = data[5]
                        break
                    
                for j in range(i0, iend):
                    if 'AREA OF NET SOIL LOSS' in wepp_out[j]:
                        
                        syr = wepp_out[j+2].split('=')[1].replace(' kg/m2 **', '').strip()
                        syr = float(syr)
                        
                        sym = wepp_out[j+3].split('=')[1].split()[0].strip()
                        sym = float(sym)
                        
                        break

                for j in range(i0, iend):
                    if 'OFF SITE EFFECTS' in wepp_out[j]:
                        syp = wepp_out[j+3].split()[-2] # value in kg/m of width
                        syp = float(syp)
                        break
                    
                if str(year) in annuals:
                    raise ValueError(f"Year {year} already in dictionary")
                
                annuals[str(year)] = {
                    'year': year,
                    'storms': int(storms),
                    'rainevents': int(rainevents),
                    'snowevents': int(snowevents),
                    'precip_mm': float(precip),
                    'runoff_from_rain_mm': float(rro),
                    'runoff_from_snow_mm': float(sro),
                    'runoff_from_rain+snow_mm': float(rro) + float(sro),
                    'soil_loss_mean_kg_m2': syr,
                    'soil_loss_max_kg_m2': sym
                }
                
                if  slope_length is None:
                    annuals[str(year)]['sediment_yield_kg_m'] = syp
                else:
                    annuals[str(year)]['sediment_yield_kg_m2'] = syp / slope_length
                
            return_periods = {}
            
            if slope_length is not None and 'sediment_yield_kg_m' in return_period_measures:
                return_period_measures.append('sediment_yield_kg_m2')
                return_period_measures.remove('sediment_yield_kg_m')
            
            for measure in return_period_measures:
                return_periods[measure] = calc_rec_intervals(annuals, measure, rec_intervals=rec_intervals)

        for i, line in enumerate(wepp_out):
            if 'ANNUAL AVERAGE SUMMARIES' in line:
                wepp_out = wepp_out[i:]
                break
            
        for i, line in enumerate(wepp_out):
            if 'RAINFALL AND RUNOFF SUMMARY' in line:
                storms = wepp_out[i+5].split()[0]
                rainevents = wepp_out[i+6].split()[0]
                snowevents = wepp_out[i+7].split()[0]
                precip = wepp_out[i+14].split()[-2]
                rro = wepp_out[i+15].split()[-2]
                sro = wepp_out[i+17].split()[-2]
                break

        for i, line in enumerate(wepp_out):
            if 'AREA OF NET SOIL LOSS' in line:
                syr = wepp_out[i+2].split('=')[1].replace(' kg/m2 **', '').strip()
                syr = float(syr)
                
                sym = wepp_out[i+3].split('=')[1].split()[0].strip()
                sym = float(sym)
                
                if i + 10 < len(wepp_out):
                    table_line = wepp_out[i+10]
                    try:
                        table_syr = float(table_line[17:24].strip())
                    except (ValueError, IndexError):
                        table_syr = None
                    try:
                        area_of_net_loss = float(table_line[9:18].strip())
                    except (ValueError, IndexError):
                        area_of_net_loss = None

        for i, line in enumerate(wepp_out):
            if 'OFF SITE EFFECTS' in line:
                syp = wepp_out[i+4].split()[0] # in kg/m of width
                syp = float(syp)
                break
            
        if sym is None:
            sym = syr

        annual_averages = {
            'storms': int(storms),
            'rainevents': int(rainevents),
            'snowevents': int(snowevents),
            'precip_mm': float(precip),
            'runoff_from_rain_mm': float(rro),
            'runoff_from_snow_mm': float(sro),
            'runoff_from_rain+snow_mm': float(rro) + float(sro),
            'soil_loss_mean_kg_m2': syr,
            'soil_loss_max_kg_m2': sym
        }
            
        if slope_length is None:
            annual_averages['sediment_yield_kg_m'] = syp
        else:
            annual_averages['sediment_yield_kg_m2'] = syp / slope_length
            
        if road_width is not None and area_of_net_loss is not None:
            road_length_exhibiting_soil_loss_m = area_of_net_loss
            road_prism_syr = table_syr if table_syr is not None else syr
            road_prism_erosion_kg = road_prism_syr * road_width * road_length_exhibiting_soil_loss_m
            sediment_leaving_buffer_kg = syp * road_width
            
            annual_averages['sim_width_m'] = road_width
            annual_averages['road_length_exhibiting_soil_loss_m'] = road_length_exhibiting_soil_loss_m
            annual_averages['road_prism_erosion_kg'] = road_prism_erosion_kg
            annual_averages['sediment_leaving_buffer_kg'] = sediment_leaving_buffer_kg

    if annuals is None:
        return annual_averages
    else:
        return {'annual_averages': annual_averages,
                'return_periods': return_periods,
                'annuals': annuals
            }


def _annual_maxima_by_year(df, years: int, column: str) -> list:
    if years <= 0:
        return []
    if df is None or df.empty:
        return [0.0] * years
    series = df.groupby("year")[column].max()
    lookup = series.to_dict()
    values = []
    for year in range(1, years + 1):
        value = lookup.get(year, 0.0)
        if value is None or not math.isfinite(value):
            value = 0.0
        values.append(float(value))
    return values


def _return_period_values(values: list, rec_intervals: list, years: int) -> dict:
    ranked = sorted(values, reverse=True) if values else []
    if years <= 0:
        return {str(interval): None for interval in rec_intervals}
    rec_indices = weibull_series(
        rec_intervals,
        years,
        method="am",
        gringorten_correction=False
    )
    result = {}
    for interval in rec_intervals:
        index = rec_indices.get(interval)
        if index is None or index >= len(ranked):
            result[str(interval)] = None
        else:
            result[str(interval)] = float(ranked[index])
    return result


def parse_wepp_ebe_return_periods(
    ebe_file: str,
    years: int,
    slope_length: Optional[float] = None,
    rec_intervals: Optional[list] = None,
    wat_file: Optional[str] = None,
    ignore_snowmelt: bool = False,
) -> dict:
    if rec_intervals is None:
        rec_intervals = [10, 5, 2, 1]

    try:
        df = _read_ebe_file(ebe_file)
    except FileNotFoundError:
        return {}

    if ignore_snowmelt and wat_file:
        df = _filter_snowmelt_events(df, wat_file)

    precip_max = _annual_maxima_by_year(df, years, "precip_mm")
    runoff_max = _annual_maxima_by_year(df, years, "runoff_mm")
    erosion_max = _annual_maxima_by_year(df, years, "av_det_kg_m2")
    sediment_max = _annual_maxima_by_year(df, years, "sed_del_kg_m")

    if slope_length and slope_length > 0:
        sediment_max = [value / slope_length for value in sediment_max]

    return {
        "return_periods": {
            "recurrence_intervals": rec_intervals,
            "precip_mm": _return_period_values(precip_max, rec_intervals, years),
            "runoff_mm": _return_period_values(runoff_max, rec_intervals, years),
            "soil_loss_mean_kg_m2": _return_period_values(erosion_max, rec_intervals, years),
            "sediment_yield_kg_m2": _return_period_values(sediment_max, rec_intervals, years),
        },
        "occurrence_probabilities": {
            "runoff": {
                "count": sum(1 for value in runoff_max if value > 0),
                "probability": sum(1 for value in runoff_max if value > 0) / years if years > 0 else 0.0,
            },
            "erosion": {
                "count": sum(1 for value in erosion_max if value > 0),
                "probability": sum(1 for value in erosion_max if value > 0) / years if years > 0 else 0.0,
            },
            "sediment_delivery": {
                "count": sum(1 for value in sediment_max if value > 0),
                "probability": sum(1 for value in sediment_max if value > 0) / years if years > 0 else 0.0,
            },
        },
    }
        
        
def _read_ebe_file(ebe_file):
    
    column_names = [
        "day", "month", "year", "precip_mm", "runoff_mm", "ir_det_kg_m2", 
        "av_det_kg_m2", "mx_det_kg_m2", "point_m", "av_dep_kg_m2", "max_dep_kg_m2", 
        "point_dep_m", "sed_del_kg_m", "er"
    ]
    
    data = []
    with open(ebe_file, 'r') as file:
        lines = file.readlines()
        for line in lines[3:]:
            line = re.sub(r'\s+', ' ', line.strip())
            if line:
                values = line.split(' ')
                if len(values) == len(column_names):
                    data.append(values)
    
    df = pd.DataFrame(data, columns=column_names)
    
    numeric_columns = [
        "precip_mm", "runoff_mm", "ir_det_kg_m2", "av_det_kg_m2", "mx_det_kg_m2", 
        "point_m", "av_dep_kg_m2", "max_dep_kg_m2", "point_dep_m", "sed_del_kg_m", "er"
    ]
    df[numeric_columns] = df[numeric_columns].apply(pd.to_numeric, errors='coerce')
    df["day"] = df["day"].astype(int)
    df["month"] = df["month"].astype(int)
    df["year"] = df["year"].astype(int)
    
    return df


_WAT_HEADER_SUBSTITUTIONS = (
    (" -", ""),
    ("#", "(#)"),
    (" mm", ""),
    ("Water(mm)", "Water"),
    ("m^2", "(m^2)"),
)

_WAT_HEADER_ALIASES = {
    "OFE (#)": "OFE",
    "OFE": "OFE",
    "P (mm)": "P",
    "RM (mm)": "RM",
    "Q (mm)": "Q",
    "Snow-Water (mm)": "Snow-Water",
    "Area (m^2)": "Area",
}


def _extract_wat_header(lines):
    header_start = None
    header_end = None

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("-"):
            if header_start is None:
                header_start = idx
            elif header_end is None:
                header_end = idx
                break

    if header_start is None or header_end is None:
        raise ValueError("Unable to locate WAT header delimiters")

    raw_header_rows = [line.split() for line in lines[header_start + 1 : header_end]]
    transposed = list(zip(*raw_header_rows))
    header = []
    for column_parts in transposed:
        merged = " ".join(column_parts)
        for old, new in _WAT_HEADER_SUBSTITUTIONS:
            merged = merged.replace(old, new)
        header.append(merged.strip())

    canonical = [_WAT_HEADER_ALIASES.get(value, value) for value in header]
    return canonical, header_end + 2


def _read_wat_daily_aggregates(wat_file: str) -> dict:
    lines = []
    with open(wat_file, "r") as file:
        lines = file.readlines()

    header, data_start = _extract_wat_header(lines)
    column_positions = {name: idx for idx, name in enumerate(header)}
    required = ["J", "Y", "P", "RM", "Q", "Area"]
    missing = [name for name in required if name not in column_positions]
    if missing:
        raise ValueError(f"Missing required WAT columns: {', '.join(missing)}")

    daily = {}
    for raw_line in lines[data_start:]:
        if not raw_line.strip():
            continue
        tokens = raw_line.split()
        if len(tokens) != len(header):
            continue
        try:
            julian = int(tokens[column_positions["J"]])
            year = int(tokens[column_positions["Y"]])
            area = float(tokens[column_positions["Area"]])
            precip = float(tokens[column_positions["P"]])
            rm = float(tokens[column_positions["RM"]])
            runoff = float(tokens[column_positions["Q"]])
        except (ValueError, IndexError):
            continue

        key = (year, julian)
        store = daily.get(key)
        if store is None:
            store = {"area": 0.0, "p_vol": 0.0, "rm_vol": 0.0, "q_vol": 0.0}
            daily[key] = store

        store["area"] += area
        store["p_vol"] += precip * area
        store["rm_vol"] += rm * area
        store["q_vol"] += runoff * area

    aggregated = {}
    for key, store in daily.items():
        area = store["area"]
        if area <= 0:
            aggregated[key] = {"P": 0.0, "RM": 0.0, "Q": 0.0}
            continue
        aggregated[key] = {
            "P": store["p_vol"] / area,
            "RM": store["rm_vol"] / area,
            "Q": store["q_vol"] / area,
        }

    return aggregated


def _snowmelt_runoff_days(wat_file: str, eps: float = 1e-6) -> set:
    try:
        daily = _read_wat_daily_aggregates(wat_file)
    except (FileNotFoundError, ValueError):
        return set()

    days = set()
    for key, values in daily.items():
        if values["Q"] > 0 and values["RM"] - values["P"] > eps:
            days.add(key)
    return days


def _filter_snowmelt_events(df: pd.DataFrame, wat_file: str) -> pd.DataFrame:
    snowmelt_days = _snowmelt_runoff_days(wat_file)
    if not snowmelt_days or df is None or df.empty:
        return df

    dates = pd.to_datetime(df[["year", "month", "day"]], errors="coerce")
    julian = dates.dt.dayofyear
    mask = [
        (year, day) in snowmelt_days
        for year, day in zip(df["year"].tolist(), julian.tolist())
    ]
    if not any(mask):
        return df
    return df.loc[~pd.Series(mask, index=df.index)]


def get_annual_maxima_events_from_ebe(ebe_file, cli_file=None):
    climate = None
    if cli_file is not None:
        climate = ClimateFile(cli_file)
    
    df = _read_ebe_file(ebe_file)
    
    largest_runoff_events = df.loc[df.groupby("year")["runoff_mm"].idxmax()]
    
    if climate is not None:
        cli_df = climate.as_dataframe(calc_peak_intensities=True)
        largest_runoff_events = largest_runoff_events.merge(
            cli_df[['da', 'mo', 'year', 'dur', '10-min Peak Rainfall Intensity (mm/hour)', 
                '30-min Peak Rainfall Intensity (mm/hour)', 
                '60-min Peak Rainfall Intensity (mm/hour)']],
            left_on=['day', 'month', 'year'],
            right_on=['da', 'mo', 'year'],
            how='left'
        ).drop(columns=['da', 'mo'])
        
    largest_runoff_events = largest_runoff_events.sort_values(by="runoff_mm", ascending=False)
    year_ranks = largest_runoff_events["year"].tolist()
    
    largest_runoff_events["runoff_rank"] = list(range(1, len(largest_runoff_events) + 1))
    
    return {
        'annual_maxima_events': largest_runoff_events.to_dict(orient='records'), 
        'runoff_year_ranks_descending': year_ranks,
        'num_years_with_runoff_event': len(year_ranks)}
    
    
def get_selected_events_from_ebe(ebe_file, selected_dates: list):
    df = _read_ebe_file(ebe_file)
    
    selected_events = []
    for date in selected_dates:
        day, month, year = date['day'], date['month'], date['year']
        day, month, year = int(day), int(month), int(year)
        selected_event = df[(df['day'] == day) & (df['month'] == month) & (df['year'] == year)]
        selected_events.extend(selected_event.to_dict(orient='records'))
    
    return selected_events

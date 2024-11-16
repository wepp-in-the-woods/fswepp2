from all_your_base.stats import weibull_series
from typing import Optional

import pandas as pd
import re

from wepppy2.climates.cligen import ClimateFile


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
    rec_intervals=[1, 2, 5, 10]) -> dict:
    
    storms, rainevents, snowevents, precip, rro, sro, syr, syp = None, None, None, None, None, None, None, None
    
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
                    
                assert str(year) not in annuals, f"Year {year} already in dictionary"
                
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
            return_period_measures = ['precip_mm', 'runoff_from_rain+snow_mm', 'soil_loss_mean_kg_m2']
            if slope_length is not None:
                return_period_measures.append('sediment_yield_kg_m2')
            else:
                return_period_measures.append('sediment_yield_kg_m')
            
            for measure in return_period_measures:
                return_periods[measure] = calc_rec_intervals(annuals, measure, rec_intervals=rec_intervals)

        # parse annual averages
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
                
                area_of_net_loss = wepp_out[i+10][9:18].strip() # Area of Net Loss (m)
                area_of_net_loss = float(area_of_net_loss)

        for i, line in enumerate(wepp_out):
            if 'OFF SITE EFFECTS' in line:
                syp = wepp_out[i+4].split()[0] # in kg/m of width
                syp = float(syp)
                break
            
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
            
        if road_width is not None:
            road_length_exhibiting_soil_loss_m = area_of_net_loss
            road_prism_erosion_kg = syr * road_width * road_length_exhibiting_soil_loss_m
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
        

def get_annual_maxima_events_from_ebe(ebe_file, cli_file=None):
    climate = None
    if cli_file is not None:
        climate = ClimateFile(cli_file)
    
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
    
    largest_runoff_events = df.loc[df.groupby("year")["runoff_mm"].idxmax()]
    
    if climate is not None:
        cli_df = climate.as_dataframe(calc_peak_intensities=True)
        largest_runoff_events = largest_runoff_events.merge(
            cli_df[['da', 'mo', 'year', '10-min Peak Rainfall Intensity (mm/hour)', 
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
    

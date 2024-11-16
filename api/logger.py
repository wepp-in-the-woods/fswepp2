from time import time
from datetime import datetime
from os.path import join as _join
import os
import struct

from fastapi import APIRouter, Query, Response, Request, HTTPException, Body
from typing import Optional
from pydantic import BaseModel, conlist

_thisdir = os.path.dirname(os.path.realpath(__file__))
_logdir = os.path.join(_thisdir, 'logs')

router = APIRouter()

def log_run(ip, model):
    year = datetime.now().year
    
    log_fn = _join(_logdir, f'{year}/{model}.log')
    os.makedirs(os.path.dirname(log_fn), exist_ok=True)
    
    ip_hex = ''.join([f'{int(octet):02x}' for octet in ip.split('.')])
    ip_bytes = bytes.fromhex(ip_hex)
    timestamp = int(time())

    with open(log_fn, 'ab') as fp:
        fp.write(struct.pack('!I', timestamp))
        fp.write(ip_bytes)
        fp.write(b'\n')


def read_log(model, year):
    
    log_fn = _join(_logdir, f'{year}/{model}.log')
    if not os.path.exists(log_fn):
        return

    runs = []
    
    with open(log_fn, 'rb') as fp:
        while True:
            # Read 4 bytes for the timestamp
            timestamp_data = fp.read(4)
            if not timestamp_data:
                break  # EOF

            # Unpack the timestamp
            timestamp = struct.unpack('!I', timestamp_data)[0]

            # Read 4 bytes for the IP address
            ip_bytes = fp.read(4)
            if len(ip_bytes) < 4:
                break

            # Read the newline character
            newline = fp.read(1)
            if newline != b'\n':
                break

            # Convert IP bytes to dotted decimal format
            ip = '.'.join([str(b) for b in ip_bytes])
            runs.append((datetime.fromtimestamp(timestamp), ip))
            
    return runs


@router.post("/logger/GET/abbreviated_stats/{model}/{year}")
def logger_get_abbreviated_stats(model: str, year: int):
    runs = read_log(model, year)
    if not runs:
        raise HTTPException(status_code=404, detail="No data found")
    
    return {
        "total_runs": len(runs),
        "unique_ips": len(set([run[1] for run in runs]))
    }


if __name__ == "__main__":
    print(read_log("wepproad", 2024))
import os
from os.path import join as _join

from fastapi import HTTPException

import wepppy2

ALLOWED_WEPP_VERSIONS = {
    "wepp2010",
}


def resolve_wepp_binary(wepp_version: str) -> str:
    if wepp_version not in ALLOWED_WEPP_VERSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid wepp_version: {wepp_version}",
        )

    wepp_bin_dir = _join(os.path.dirname(wepppy2.__file__), "wepp_runner/bin")
    wepp_path = _join(wepp_bin_dir, wepp_version)
    if not os.path.exists(wepp_path):
        raise HTTPException(
            status_code=500,
            detail=f"WEPP version {wepp_version} not found",
        )

    return wepp_path

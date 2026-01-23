import os
import subprocess
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


def run_wepp_binary(
    wepp_path: str,
    run_fn: str,
    stout_fn: str,
    sterr_fn: str,
    cwd: str,
    timeout_seconds: int = 10,
) -> None:
    try:
        with open(run_fn, "r") as run_fp, open(stout_fn, "w") as out_fp, open(
            sterr_fn, "w"
        ) as err_fp:
            subprocess.run(
                [wepp_path],
                stdin=run_fp,
                stdout=out_fp,
                stderr=err_fp,
                cwd=cwd,
                check=True,
                timeout=timeout_seconds,
            )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail=f"WEPP run timed out after {timeout_seconds}s",
        ) from exc

import argparse
import json
import os
import shutil
import subprocess
import gzip
import re
import time
from pathlib import Path

import requests
import yaml


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _write_json(path: Path, data) -> None:
    _ensure_dir(path.parent)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, sort_keys=True)
    os.chmod(path, 0o644)


def _write_text(path: Path, data: str) -> None:
    _ensure_dir(path.parent)
    with path.open("w", encoding="utf-8") as fh:
        fh.write(data)
    os.chmod(path, 0o644)

def _extract_run_ids(text: str) -> list:
    # WEPP:Road HTML explicitly includes "WEPP:Road run ID wepp-<pid>"
    run_ids = []
    for match in re.findall(r"WEPP:Road run ID\s+(wepp-\d+)", text):
        run_ids.append(match)
    if run_ids:
        return run_ids

    # Fallback: capture any wepp-<digits> tokens if present
    for match in re.findall(r"\bwepp-\d+\b", text):
        run_ids.append(match)

    return sorted(set(run_ids))

def _extract_wepproad_sections(text: str) -> dict:
    mapping = {
        "showslopefile": "slp",
        "showsoilfile": "sol",
        "showresponsefile": "in",
        "showextendedoutput": "out",
        "showcligenparfile": "par",
    }
    sections = {ext: [] for ext in mapping.values()}
    current_ext = None
    in_pre = False

    marker = 'filewindow.document.writeln("'

    for line in text.splitlines():
        for func, ext in mapping.items():
            if f"function {func}(" in line:
                current_ext = ext
                in_pre = False
                break

        if marker not in line:
            continue

        start = line.find(marker)
        if start == -1:
            continue

        value = line[start + len(marker):]
        if value.endswith('")'):
            value = value[:-2]
        value = value.replace("\\/", "/").replace("\\\"", "\"")

        if "<pre>" in value:
            in_pre = True
            continue
        if "</pre>" in value or "<\\/pre>" in value:
            in_pre = False
            continue

        if in_pre and current_ext:
            sections[current_ext].append(value)

    return {ext: lines for ext, lines in sections.items() if lines}


def _http_request(base_url: str, request_spec: dict, out_dir: Path) -> dict:
    name = request_spec["name"]
    method = request_spec.get("method", "POST").upper()
    path = request_spec["path"]
    url = base_url.rstrip("/") + path

    payload = request_spec.get("json")
    headers = request_spec.get("headers") or {}

    request_meta = {
        "method": method,
        "url": url,
        "headers": headers,
        "json": payload,
    }

    _write_json(out_dir / f"{name}.request.json", request_meta)

    response = requests.request(method, url, json=payload, headers=headers)
    resp_meta = {
        "status_code": response.status_code,
        "headers": dict(response.headers),
        "url": response.url,
    }

    _write_json(out_dir / f"{name}.response.meta.json", resp_meta)

    body_path = out_dir / f"{name}.response.body"
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            _write_json(body_path.with_suffix(".json"), response.json())
        except ValueError:
            _write_text(body_path.with_suffix(".txt"), response.text)
    else:
        _write_text(body_path.with_suffix(".txt"), response.text)

    return resp_meta


def _run_curl(command: str, out_path: Path) -> dict:
    _ensure_dir(out_path.parent)
    result = subprocess.run(
        command,
        shell=True,
        check=False,
        capture_output=True,
    )

    stdout_bytes = result.stdout or b""
    if stdout_bytes.startswith(b"\x1f\x8b"):
        try:
            stdout_text = gzip.decompress(stdout_bytes).decode("utf-8", errors="replace")
        except OSError:
            stdout_text = stdout_bytes.decode("utf-8", errors="replace")
    else:
        stdout_text = stdout_bytes.decode("utf-8", errors="replace")

    out_path.write_text(stdout_text, encoding="utf-8")

    return {
        "command": command,
        "returncode": result.returncode,
        "stdout_bytes": len(stdout_bytes),
        "stderr": (result.stderr or b"").decode("utf-8", errors="replace").strip(),
        "run_ids": _extract_run_ids(stdout_text),
    }


def _copy_working_files(
    working_dir: Path,
    dest_dir: Path,
    since_ts: float,
    glob_pattern: str | None,
    run_ids: list | None = None,
) -> list:
    _ensure_dir(dest_dir)
    copied = []

    if run_ids:
        candidates = []
        for run_id in run_ids:
            candidates.extend(working_dir.glob(f"{run_id}*"))
    else:
        candidates = list(working_dir.glob(glob_pattern)) if glob_pattern else list(working_dir.iterdir())
    for path in candidates:
        try:
            if path.stat().st_mtime < since_ts:
                continue
        except FileNotFoundError:
            continue

        if path.is_file():
            target = dest_dir / path.name
            shutil.copy2(path, target)
            os.chmod(target, 0o644)
            copied.append(str(target))

    return copied


def collect_case(case: dict, out_root: Path) -> dict:
    case_id = case["id"]
    model = case.get("model", "unknown")

    case_dir = out_root / model / case_id
    api_dir = case_dir / "api"
    legacy_dir = case_dir / "legacy"
    legacy_working_dir = legacy_dir / "working"

    _ensure_dir(api_dir)
    _ensure_dir(legacy_dir)
    if legacy_working_dir.exists():
        for path in legacy_working_dir.iterdir():
            if path.is_file():
                path.unlink()

    summary = {
        "id": case_id,
        "model": model,
        "api": [],
        "legacy": [],
        "working_files": [],
        "started_at": time.time(),
    }
    reconstructed_files = []

    api_spec = case.get("api") or {}
    base_url = api_spec.get("base_url")
    requests_spec = api_spec.get("requests") or []
    if base_url and requests_spec:
        for req in requests_spec:
            meta = _http_request(base_url, req, api_dir)
            summary["api"].append({"name": req["name"], "meta": meta})

    legacy_spec = case.get("legacy") or {}
    working_dir = Path(legacy_spec.get("working_dir", "/workdir/fswepp-docker/var/www/cgi-bin/fswepp/working"))
    working_glob = legacy_spec.get("working_glob")
    curl_specs = legacy_spec.get("curl") or []

    legacy_start = time.time()
    run_ids = []
    for curl_spec in curl_specs:
        name = curl_spec.get("name", "curl")
        command = curl_spec.get("command", "").strip()
        if not command or command.startswith("#"):
            continue
        out_path = legacy_dir / f"{name}.response.body"
        meta = _run_curl(command, out_path)
        run_ids.extend(meta.get("run_ids") or [])
        summary["legacy"].append({"name": name, "meta": meta})

        if case.get("model") == "wepproad":
            response_text = out_path.read_text(encoding="utf-8", errors="replace")
            sections = _extract_wepproad_sections(response_text)
            if sections:
                for run_id in meta.get("run_ids") or []:
                    for ext, lines in sections.items():
                        target = legacy_working_dir / f"{run_id}.{ext}"
                        _write_text(target, "\n".join(lines) + "\n")
                        reconstructed_files.append(str(target))

    copied = _copy_working_files(
        working_dir,
        legacy_working_dir,
        legacy_start,
        working_glob,
        run_ids=sorted(set(run_ids)) or None,
    )
    if reconstructed_files:
        summary["working_files"] = sorted(set(copied + reconstructed_files))
    else:
        summary["working_files"] = copied

    summary["finished_at"] = time.time()

    _write_json(case_dir / "run.json", summary)

    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", required=True, help="Path to cases.yaml")
    parser.add_argument("--out", required=True, help="Output root directory")
    args = parser.parse_args()

    with open(args.cases, "r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh)

    cases = data.get("cases", [])
    out_root = Path(args.out)

    results = []
    for case in cases:
        results.append(collect_case(case, out_root))

    _write_json(out_root / "runs.json", results)


if __name__ == "__main__":
    main()

# FSWEPP2 Parity Runs

This directory stores repeatable, scripted parity runs that compare:
- FastAPI outputs (JSON/text endpoints)
- Legacy CGI HTML responses
- Legacy WEPP/CLIGEN working files in `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/working`

Each run is stored under:

```
/workdir/fswepp2/parity-runs/<model>/<run_enum>/
```

## Workflow

1) Fill in the per-model `cases.yaml` with:
   - Legacy curl command(s)
   - Optional API request payload(s) if you're running the API parity checks
2) Run the collection script:

```
python /workdir/fswepp2/scripts/collect_representative_runs.py \
  --cases /workdir/fswepp2/parity-runs/ermit/cases.yaml \
  --out /workdir/fswepp2/parity-runs
```

Legacy-only (skip API calls):

```
python /workdir/fswepp2/scripts/collect_representative_runs.py \
  --cases /workdir/fswepp2/parity-runs/ermit/cases.yaml \
  --out /workdir/fswepp2/parity-runs \
  --skip-api
```

## Output layout (per run)

```
<model>/<run_enum>/
  api/
    <request_name>.request.json
    <request_name>.response.body
    <request_name>.response.meta.json
  legacy/
    <curl_name>.response.body
    working/
      wepp-<pid>.*
  run.json
```

`run.json` contains a summary of what was executed and captured.

## Notes

- The script copies legacy working files by mtime and optional glob filter.
- The legacy CGI stack must be running and volume-mounted.
- Provide curl commands exactly as used in the browser form submission.
- If legacy responses are gzip-compressed, the script will auto-decompress.
- **Important (do not wipe legacy runs):** `collect_representative_runs.py` clears
  the destination `legacy/working/` directory only after a successful legacy
  run that produces new working files. If the legacy curl fails or no new files
  are captured, existing artifacts are preserved. To preserve existing legacy
  artifacts across successful runs, either:
  - run with a different `--out` directory (e.g., `/workdir/fswepp2/parity-runs-YYYYMMDD`), or
  - copy `parity-runs/<model>/<run_enum>/legacy/working` elsewhere before re-running,
  - or rely on git to restore (`git checkout -- parity-runs/<model>/<run_enum>/legacy/working`).

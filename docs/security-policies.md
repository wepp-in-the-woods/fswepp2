# FSWEPP2 Security Policies

This document defines security policies for the FSWEPP2 interface (FastAPI backend
and any future frontend). It draws on the practices and testing procedures documented
in `docs/january-2026-security-assessment.md` and applies them to the new stack.

## Scope

- Backend: `/workdir/fswepp2/api` (FastAPI)
- Frontend: planned rewrite (likely simple HTML/JS forms)
- Execution: WEPP/CLIGEN binaries via `wepppy2`

## Core Policies

### 1) Input validation (allowlists first)
- Use strict allowlists for enums (e.g., soil textures, vegetation types, surface
  types, burn severity, wepp_version).
- Enforce numeric ranges on all user-controllable inputs (slope %, lengths,
  rock fragment %, climate years, etc.).
- Reject unknown/extra fields in request bodies where possible.
- Normalize numeric values to floats/ints before use or output.

### 2) No shell execution
- Do not use shell-form subprocess calls (`shell=True`).
- Use list-form `subprocess.run` with explicit stdin/stdout/stderr.
- Model binaries must be allowlisted and resolved to a known directory.

### 3) Safe file handling
- All generated artifacts must live under `/dev/shm/<model>/`.
- Never write to web-root or other web-writable paths.
- Do not accept user-supplied filesystem paths.
- Use deterministic, stable filenames derived from normalized inputs.

### 4) Error handling / debug gating
- `FSWEPP_DEBUG=0` in production: no stack traces or filesystem paths in output.
- `FSWEPP_DEBUG=1` allowed only in dev/staging.
- Log internal errors server-side; return generic 500 responses to clients.

### 5) Output safety
- Do not echo raw user input in responses without validation/encoding.
- For text file responses, ensure content is generated from trusted templates or
  sanitized values.

### 6) CORS / browser surface
- Restrict CORS origins to known frontend domains.
- For cookies: use `Secure`, `HttpOnly`, and `SameSite` where applicable.
- Avoid storing secrets in client-side code.

### 7) Dependencies and supply chain
- Pin dependency versions where possible.
- Run dependency security audits (see Testing).
- Avoid unmaintained or unreviewed libraries.

## Testing and Verification

The legacy assessment emphasizes allowlists, no shell execution, path safety,
stack-trace gating, and automated security regression suites. Apply the same
standards to FSWEPP2.

### Automated security scanning (recommended)

Run from `/workdir/fswepp2`:

- Python dependency audit:
  - `pip-audit` (or `pip-audit -r requirements.txt`)
- Python static analysis:
  - `bandit -r api`
- Container image scanning (if building images):
  - `trivy image <image>`
- Convenience wrapper:
  - `./scripts/security-checks.sh` (runs pip-audit + bandit, optional trivy when an image name is supplied)

### Automated security suites (legacy reference)

The following Node security suites exist in the legacy repo and should remain in
use for the existing CGI stack:

- `BASE_URL=http://localhost:8080 npm run test:security:manual`
- `BASE_URL=http://localhost:8080 npm run test:security`

These suites validate XSS reflection, path disclosure, and regression checks
for legacy routes. They do not currently cover FSWEPP2 API routes.

### Unit tests (FSWEPP2)

Add/maintain unit tests for:
- Model validation and input ranges
- Deterministic hashing (stable IDs across restarts)
- WEPP version allowlist enforcement
- No shell execution in runner functions

Suggested test layout:
- `api/tests/test_validation.py`
- `api/tests/test_hash_utils.py`
- `api/tests/test_wepp_runner.py`

Suggested execution:
- `python -m pytest`

### Manual verification (FSWEPP2)

For any new or changed endpoints:
- Verify `FSWEPP_DEBUG=0` responses never include filesystem paths.
- Confirm invalid enum values return 400 (allowlist enforcement).
- Confirm out-of-range numeric inputs are rejected.
- Confirm WEPP binaries are invoked without shell and only via allowlisted paths.

## Release Checklist

- [ ] FSWEPP_DEBUG set to 0 in production
- [ ] Input allowlists/ranges enforced for all endpoints
- [ ] No shell-form subprocess calls
- [ ] Deterministic hash IDs used for all generated files
- [ ] Dependency audit and static analysis clean
- [ ] Unit tests pass
- [ ] Manual verification complete

#!/usr/bin/env bash
set -euo pipefail

venv_bin=""
if [[ -x ".venv/bin/pip-audit" ]]; then
  venv_bin=".venv/bin"
fi

if [[ -n "$venv_bin" ]]; then
  echo "[security] using tools from ${venv_bin}"
else
  echo "[security] using tools from PATH"
fi

echo "[security] pip-audit..."
if [[ -n "$venv_bin" ]]; then
  "$venv_bin/pip-audit" -r requirements.txt
elif command -v pip-audit >/dev/null 2>&1; then
  pip-audit -r requirements.txt
else
  echo "pip-audit is not installed. Install it with: pip install pip-audit"
  exit 1
fi

echo "[security] bandit..."
if [[ -n "$venv_bin" ]]; then
  "$venv_bin/bandit" -r api
elif command -v bandit >/dev/null 2>&1; then
  bandit -r api
else
  echo "bandit is not installed. Install it with: pip install bandit"
  exit 1
fi

echo "[security] trivy (optional)..."
if command -v trivy >/dev/null 2>&1; then
  if [[ "${1:-}" != "" ]]; then
    trivy image "$1"
  else
    echo "trivy installed; pass an image name to scan: ./scripts/security-checks.sh <image>"
  fi
else
  echo "trivy not installed; skipping"
fi

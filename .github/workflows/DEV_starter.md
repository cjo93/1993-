# DEFRAG — Developer Starter

## Layout
- `index.html` — GitHub Pages landing.
- `unified_field_v0/` — FastAPI service.

## Local dev (backend)
cd unified_field_v0
python3 -m venv .venv && source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
export UF_CACHE=.uf_cache
python -m uvicorn app:app --reload --port 8000

## API key middleware
Service expects `x-api-key`. Allowlist should include `/`, `/docs`, `/openapi.json`, favicon paths.

## GitHub Pages
- Source: `main` (root).
- URL: https://cjo93.github.io/1993-/

## CI
`.github/workflows/housekeeping.yml` lints and does an import check on push/PR and nightly.

## Backlog (quick wins)
- Add `/healthz` (200 OK).
- Bypass middleware for `/favicon.ico` etc.
- Publish a Postman collection with `x-api-key`.
- Later: Docker + Cloud Run after billing.
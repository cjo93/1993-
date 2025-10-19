# DEFRAG — Unified Field Engine (v0.6)

Run locally:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export UF_CACHE=.uf_cache
uvicorn app:app --reload --port 8000
```

Visit `/` for the landing page, `/docs` for API docs. Use header `x-api-key: free-demo-key`.

Deploy: add GitHub Secrets `GCP_PROJECT_ID` and `GCP_SA_KEY`, push to `main`.

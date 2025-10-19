from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
async def home():
    return "<h1>DEFRAG API</h1><p>Try <code>/healthz</code>.</p>"

@app.get("/healthz", response_class=JSONResponse)
async def healthz():
    return {"status": "ok"}

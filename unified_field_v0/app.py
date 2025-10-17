from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from auth import require_api_key

app = FastAPI()

@app.middleware("http")
async def authentication_middleware(request: Request, call_next):
    if request.url.path == "/healthz":
        return await call_next(request)

    api_key = request.headers.get("x-api-key")
    try:
        require_api_key(api_key)
    except ValueError as e:
        return JSONResponse(status_code=401, content={"detail": str(e)})

    response = await call_next(request)
    return response

@app.get("/", response_class=HTMLResponse)
async def home():
    return "<h1>DEFRAG API</h1><p>Try <code>/healthz</code>.</p>"

@app.get("/healthz", response_class=JSONResponse)
async def healthz():
    return {"status": "ok"}

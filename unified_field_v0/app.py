#!/usr/bin/env python3
import os, json, base64
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Body, HTTPException, Request, Response
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from horizons_client import fetch_observer, parse_ecliptic_lon_lat
from astro_utils import jd_utc, mean_obliquity_deg, lst_deg, asc_longitude_deg, mc_longitude_deg, placidus_cusps
from mandala_renderer import render_mandala
from auth import require_api_key, Plan
from billing import record_usage

app = FastAPI(title="Unified Field Engine (DEFRAG)", version="0.6")

ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]
def deg_to_sign(deg: float) -> str: return ZODIAC[int((deg % 360)//30)]

class Site(BaseModel):
    lon: float
    lat: float
    elev_m: float = 0.0

class EphemerisRequest(BaseModel):
    epoch_utc: str = Field(..., example="1993-07-27 03:00:00")
    site: Site
    targets: List[str]

class BodyPoint(BaseModel):
    name: str
    lon_deg: float
    lat_deg: float

class AstroDeriveRequest(BaseModel):
    epoch_utc: str
    site: Site
    bodies: List[BodyPoint]

class Placement(BaseModel):
    planet: str
    lon_deg: float
    sign: str
    house: int

class ArchetypeRequest(BaseModel):
    placements: List[Placement]

class MandalaRequest(BaseModel):
    angles: Dict[str, float]
    houses: Dict[str, Any]
    placements: List[Placement]
    options: Optional[Dict[str, Any]] = None

@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    if request.url.path.startswith("/static") or request.url.path in ("/", "/health", "/docs", "/openapi.json"):
        return await call_next(request)
    plan = require_api_key(request.headers.get("x-api-key", ""))
    request.state.plan = plan
    response = await call_next(request)
    try: record_usage(plan.name, request.url.path)
    except Exception: pass
    return response

@app.get("/")
def index():
    try:
        html = open("static/index.html","r").read()
        return Response(content=html, media_type="text/html")
    except Exception:
        return {"message":"DEFRAG — coming soon."}

@app.get("/health")
def health(): return {"ok": True, "time": datetime.utcnow().isoformat()+"Z"}

@app.post("/ephemeris/horizons")
def ephemeris_horizons(req: EphemerisRequest, request: Request):
    out_bodies = []
    for t in req.targets:
        data = fetch_observer(target=t, epoch_utc=req.epoch_utc, lon_deg=req.site.lon, lat_deg=req.site.lat, elev_m=req.site.elev_m)
        ecl = parse_ecliptic_lon_lat(data)
        out_bodies.append({"name": t, **ecl})
    return { "epoch_utc": req.epoch_utc, "site": req.site.dict(), "bodies": out_bodies }

@app.post("/derive/astro")
def derive_astro(req: AstroDeriveRequest, request: Request):
    dt = datetime.strptime(req.epoch_utc, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    JD = jd_utc(dt); eps = mean_obliquity_deg(JD); LST = lst_deg(JD, req.site.lon)
    asc_deg = asc_longitude_deg(LST, eps, req.site.lat); mc_deg  = mc_longitude_deg(LST, eps)
    cusps = placidus_cusps(req.site.lat, LST, eps)
    placements = []
    L = sorted([c % 360 for c in cusps])
    for b in req.bodies:
        sign = deg_to_sign(b.lon_deg); LON = b.lon_deg % 360; house = 1
        for i in range(12):
            a = L[i]; d = L[(i+1)%12]
            if a < d and a <= LON < d: house = i+1; break
            if a > d and (LON >= a or LON < d): house = i+1; break
        placements.append({"planet": b.name, "lon_deg": b.lon_deg, "sign": sign, "house": house})
    return {
        "angles": {"asc_deg": asc_deg, "mc_deg": mc_deg, "obliquity_deg": eps, "lst_deg": LST},
        "houses": {"system":"Placidus", "cusps_deg": cusps},
        "placements": placements
    }

@app.post("/derive/archetypes")
def derive_archetypes(req: ArchetypeRequest):
    path = "archetype_matrix_normalized_v1.json"
    if not os.path.exists(path): raise HTTPException(500, "Missing archetype_matrix_normalized_v1.json")
    matrix = json.loads(open(path).read())
    key_map = {}
    for r in matrix:
        key = (r["planet"].title(), r["sign"].title(), int(r["house"])); key_map.setdefault(key, []).append(r)
    matches = []
    for p in req.placements:
        key = (p.planet.title(), p.sign.title(), int(p.house))
        for row in key_map.get(key, []): matches.append({"placement": p.dict(), "archetype": row["archetype"], "row": row})
    return {"matches": matches}

@app.post("/render/mandala")
def render_mandala_api(req: MandalaRequest):
    svg_path = "mandala_render.svg"
    manifest = render_mandala(req.angles, req.houses, [p.dict() for p in req.placements], req.options or {}, out_svg=svg_path)
    svg_bytes = open(svg_path, "rb").read()
    return {"image_b64": base64.b64encode(svg_bytes).decode("utf-8"), "manifest": manifest}

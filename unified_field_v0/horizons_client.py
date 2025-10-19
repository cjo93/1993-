#!/usr/bin/env python3
import os, json, requests
HORIZONS_FILE_API = "https://ssd-api.jpl.nasa.gov/horizons_file.api"
CACHE_DIR = os.environ.get("UF_CACHE","./.uf_cache")
def sha256(s: str):
    import hashlib; return hashlib.sha256(s.encode("utf-8")).hexdigest()
def ensure_dir(path: str): os.makedirs(path, exist_ok=True)
def build_request_payload(*, target: str, epoch_utc: str, lon_deg: float, lat_deg: float, elev_m: float):
    return {"format":"json","EPHEM_TYPE":"OBSERVER","COMMAND":target,"CENTER":"coord@399",
            "SITE_COORD":f"{lon_deg},{lat_deg},{elev_m}","START_TIME":epoch_utc,"STOP_TIME":epoch_utc,"STEP_SIZE":"1 m",
            "CAL_FORMAT":"CAL","TIME_DIGITS":"SECONDS","ANG_FORMAT":"DEG","OUT_UNITS":"KM-S","RANGE_UNITS":"AU",
            "APPARENT":"AIRLESS","REF_SYSTEM":"ICRF","REF_PLANE":"ECLIPTIC","TP_TYPE":"ABSOLUTE","SKIP_DAYLT":"NO",
            "SOLAR_ELONG":"0,180","EXTRA_PREC":"YES","CSV_FORMAT":"NO","OBJ_DATA":"NO","QUANTITIES":"31"}
def fetch_observer(*, target: str, epoch_utc: str, lon_deg: float, lat_deg: float, elev_m: float):
    payload = build_request_payload(target=target, epoch_utc=epoch_utc, lon_deg=lon_deg, lat_deg=lat_deg, elev_m=elev_m)
    req_str = json.dumps(payload, sort_keys=True); key = sha256(req_str)
    ensure_dir(CACHE_DIR); cache_file = os.path.join(CACHE_DIR, f"{key}.json")
    if os.path.exists(cache_file): return json.load(open(cache_file))
    resp = requests.post(HORIZONS_FILE_API, json=payload, timeout=60); resp.raise_for_status()
    data = resp.json(); json.dump(data, open(cache_file,"w"), indent=2); return data
def parse_ecliptic_lon_lat(data: dict) -> dict:
    fields, rows = None, None
    if "result" in data and isinstance(data["result"], dict):
        res = data["result"]
        if "data" in res and isinstance(res["data"], dict):
            fields = res["data"].get("fields"); rows = res["data"].get("rows")
    if fields is None and "ephem" in data:
        ephem = data["ephem"]; table = ephem.get("table", {})
        fields = table.get("fields"); rows = table.get("rows")
    if not fields or not rows: raise ValueError("Cannot find ephemeris table")
    def find_idx(names):
        for i, name in enumerate(fields):
            for n in names:
                if n.lower() in str(name).lower(): return i
        return None
    idx_lon = find_idx(["ecl-lon","ecliptic lon","ecl longitude","ecl_lon"])
    idx_lat = find_idx(["ecl-lat","ecliptic lat","ecl latitude","ecl_lat"])
    row = rows[0]; return {"lon_deg": float(row[idx_lon]), "lat_deg": float(row[idx_lat])}

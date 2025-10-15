#!/usr/bin/env python3
import math
from datetime import datetime, timezone
DEG = math.pi/180.0; RAD = 180.0/math.pi
def jd_utc(dt: datetime) -> float:
    if dt.tzinfo is None: raise ValueError("datetime must be UTC-aware")
    y = dt.year; m = dt.month; d = dt.day + (dt.hour + (dt.minute + dt.second/60.0)/60.0)/24.0
    if m <= 2: y -= 1; m += 12
    A = math.floor(y/100); B = 2 - A + math.floor(A/4)
    return math.floor(365.25*(y + 4716)) + math.floor(30.6001*(m + 1)) + d + B - 1524.5
def mean_obliquity_deg(JD: float) -> float:
    T=(JD-2451545.0)/36525.0; U=T/100.0
    eps0=84381.448-4680.93*U-1.55*(U**2)+1999.25*(U**3)-51.38*(U**4)-249.67*(U**5)-39.05*(U**6)+7.12*(U**7)+27.87*(U**8)+5.79*(U**9)+2.45*(U**10)
    return eps0/3600.0
def gst_deg(JD: float) -> float:
    T=(JD-2451545.0)/36525.0; GMST_sec=67310.54841+(876600.0*3600+8640184.812866)*T+0.093104*(T**2)-6.2e-6*(T**3)
    return (GMST_sec/240.0)%360.0
def lst_deg(JD: float, lon_deg: float) -> float: return (gst_deg(JD)+lon_deg)%360.0
def normalize_deg(x: float) -> float: return x%360.0
def mc_longitude_deg(LST_deg: float, eps_deg: float) -> float:
    theta=LST_deg*DEG; eps=eps_deg*DEG; x=math.cos(theta); y=math.sin(theta)*math.cos(eps); lam=math.atan2(y,x)*RAD; return normalize_deg(lam)
def asc_longitude_deg(LST_deg: float, eps_deg: float, lat_deg: float) -> float:
    theta=LST_deg*DEG; eps=eps_deg*DEG; phi=lat_deg*DEG; y=-math.cos(theta); x=math.sin(theta)*math.cos(eps)+math.tan(phi)*math.sin(eps)
    lam=math.atan2(y,x)*RAD; return normalize_deg(lam)
def _wrap_deg(x: float) -> float: return x%360.0
def _ecl_to_equ(lam_deg: float, eps_deg: float) -> tuple:
    lam=lam_deg*DEG; eps=eps_deg*DEG; sinlam=math.sin(lam); coslam=math.cos(lam)
    alpha=math.atan2(sinlam*math.cos(eps), coslam)*RAD%360.0; delta=math.asin(math.sin(eps)*sinlam)*RAD; return alpha, delta
def _semi_arc_day(phi_deg: float, delta_deg: float) -> float:
    phi=phi_deg*DEG; delta=delta_deg*DEG; x=-math.tan(phi)*math.tan(delta); x=max(-1.0,min(1.0,x)); return math.degrees(math.acos(x))
def _semi_arc_night(phi_deg: float, delta_deg: float) -> float:
    phi=phi_deg*DEG; delta=delta_deg*DEG; x= math.tan(phi)*math.tan(delta); x=max(-1.0,min(1.0,x)); return math.degrees(math.acos(x))
def _solve_cusp(phi_deg: float, eps_deg: float, ra_ref_deg: float, frac: float, use_day_arc: bool, lam_guess_deg: float) -> float:
    def f(lam_deg):
        alpha, delta = _ecl_to_equ(lam_deg, eps_deg); H = _semi_arc_day(phi_deg, delta) if use_day_arc else _semi_arc_night(phi_deg, delta)
        return (alpha - (ra_ref_deg + frac*H) + 540.0)%360.0 - 180.0
    x0=lam_guess_deg%360.0; x1=(x0+1.0)%360.0; f0=f(x0); f1=f(x1)
    for _ in range(40):
        if abs(f1-f0)<1e-9: break
        x2=(x1 - f1*(x1-x0)/(f1-f0))%360.0; x0,x1=x1,x2; f0,f1=f1,f(x1)
        if abs(f1)<1e-8: break
    return x1%360.0
def placidus_cusps(lat_deg: float, lst_deg: float, eps_deg: float) -> list:
    lam_mc=mc_longitude_deg(lst_deg, eps_deg); lam_ic=_wrap_deg(lam_mc+180.0); lam_asc=asc_longitude_deg(lst_deg, eps_deg, lat_deg); lam_dsc=_wrap_deg(lam_asc+180.0)
    ra_mc=lst_deg%360.0; ra_ic=_wrap_deg(ra_mc+180.0)
    h10=lam_mc
    h11=_solve_cusp(lat_deg, eps_deg, ra_mc, 1.0/3.0, True,  lam_mc+30.0)
    h12=_solve_cusp(lat_deg, eps_deg, ra_mc, 2.0/3.0, True,  lam_mc+60.0)
    h9 =_solve_cusp(lat_deg, eps_deg, ra_mc,-1.0/3.0, True,  lam_mc-30.0)
    h8 =_solve_cusp(lat_deg, eps_deg, ra_mc,-2.0/3.0, True,  lam_mc-60.0)
    h4 =lam_ic
    h3 =_solve_cusp(lat_deg, eps_deg, ra_ic, 2.0/3.0, False, lam_ic+60.0)
    h2 =_solve_cusp(lat_deg, eps_deg, ra_ic, 1.0/3.0, False, lam_ic+30.0)
    h5 =_solve_cusp(lat_deg, eps_deg, ra_ic,-1.0/3.0, False, lam_ic-30.0)
    h6 =_solve_cusp(lat_deg, eps_deg, ra_ic,-2.0/3.0, False, lam_ic-60.0)
    h1=lam_asc; h7=lam_dsc; return [ _wrap_deg(c) for c in [h1,h2,h3,h4,h5,h6,h7,h8,h9,h10,h11,h12] ]

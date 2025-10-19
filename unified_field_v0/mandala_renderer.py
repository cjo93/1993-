#!/usr/bin/env python3
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
def _pol2(r, th): return (r*math.cos(th), r*math.sin(th))
def _deg2rad(d): return math.radians(90 - (d % 360))
def render_mandala(angles, houses, placements, options=None, out_svg=None, out_png=None):
    options = options or {}
    rings = options.get("rings") or [
        {"name":"Inner Seal","r":0.12,"kind":"seal"},
        {"name":"Planet Ring","r":0.22,"kind":"points"},
        {"name":"Aspect Polygon","r":0.34,"kind":"poly"},
        {"name":"Harmonics Lattice","r":0.46,"kind":"lattice","nfold":12},
        {"name":"House Ring","r":0.60,"kind":"spokes"},
        {"name":"Outer Halo","r":0.78,"kind":"halo"},
        {"name":"Boundary","r":0.95,"kind":"boundary"}
    ]
    fig = plt.figure(figsize=(8,8)); ax = plt.gca(); ax.set_aspect('equal'); ax.axis('off')
    for ring in rings: ax.add_artist(plt.Circle((0,0), ring["r"], fill=False, linewidth=1.0))
    for key in ["asc_deg","mc_deg"]:
        th=_deg2rad(angles[key]); x,y=_pol2(0.95, th); ax.plot([0,x],[0,y], linewidth=1.2)
    for ring in rings:
        if ring["kind"]=="spokes":
            r=ring["r"]
            for a in houses["cusps_deg"]:
                th=_deg2rad(a); x,y=_pol2(r, th); ax.plot([0,x],[0,y], linewidth=0.8)
    for ring in rings:
        if ring["kind"]=="lattice":
            n=int(ring.get("nfold",12)); r=ring["r"]; pts=[]
            for i in range(n): th=_deg2rad(i*360.0/n); pts.append(_pol2(r, th))
            for k in [2,3,4,5]:
                xs,ys=[],[]
                for i in range(n+1):
                    j=(i*k)%n; xs.append(pts[j][0]); ys.append(pts[j][1])
                ax.plot(xs, ys, linewidth=0.6)
    order = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto","Chiron","True Node"]
    placement_map = {p["planet"]: p for p in placements}
    for ring in rings:
        if ring["kind"]=="points":
            r=ring["r"]
            for name in order:
                if name not in placement_map: continue
                p=placement_map[name]; th=_deg2rad(p["lon_deg"]); x,y=_pol2(r, th)
                ax.plot(x, y, marker='o', markersize=4)
                x2,y2=_pol2(r+0.02, th); ax.plot([x,x2],[y,y2], linewidth=0.8)
                xlab,ylab=_pol2(r+0.045, th); ax.text(xlab, ylab, name, ha='center', va='center', fontsize=8)
    pts=[]
    for name in order:
        if name in placement_map:
            th=_deg2rad(placement_map[name]["lon_deg"]); x,y=_pol2(0.34, th); pts.append((x,y))
    if len(pts)>=3:
        xs=[p[0] for p in pts]+[pts[0][0]]; ys=[p[1] for p in pts]+[pts[0][1]]; ax.plot(xs, ys, linewidth=1.0)
    r=0.12; rho=[i*math.pi/180 for i in range(360)]; rr=[r*(0.65+0.35*math.cos(8*t)) for t in rho]
    ax.plot([rr[i]*math.cos(rho[i]) for i in range(360)], [rr[i]*math.sin(rho[i]) for i in range(360)], linewidth=0.8)
    t=[i*4*math.pi/500 for i in range(500)]; rr2=[0.78*0.9+(0.78*0.12)*(i/499.0) for i in range(500)]
    ax.plot([rr2[i]*math.cos(t[i]) for i in range(500)], [rr2[i]*math.sin(t[i]) for i in range(500)], linewidth=0.5)
    ax.add_artist(plt.Circle((0,0), 0.95, fill=False, linewidth=2.0))
    if out_svg: plt.savefig(out_svg, bbox_inches="tight")
    if out_png: plt.savefig(out_png, dpi=200, bbox_inches="tight")
    plt.close(); return {"angles": angles, "houses": houses, "options": options or {}}

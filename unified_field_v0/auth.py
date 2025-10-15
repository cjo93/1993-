#!/usr/bin/env python3
import os, json
from dataclasses import dataclass
@dataclass
class Plan: name: str; rate_limit: int
def load_plans():
    path = "plans.json"
    if not os.path.exists(path):
        return {"FREE":{"rate_limit":1000},"CREATOR":{"rate_limit":10000},"STUDIO":{"rate_limit":100000},"ENTERPRISE":{"rate_limit":1000000}}
    return json.load(open(path))
PLANS = load_plans()
def require_api_key(api_key: str) -> Plan:
    master = os.environ.get("API_KEY_MASTER","")
    if api_key == master and master: return Plan("ENTERPRISE", PLANS["ENTERPRISE"]["rate_limit"])
    if api_key == "free-demo-key": return Plan("FREE", PLANS["FREE"]["rate_limit"])
    if not api_key: raise ValueError("Missing x-api-key")
    return Plan("CREATOR", PLANS["CREATOR"]["rate_limit"])

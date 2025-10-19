#!/usr/bin/env python3
import threading, json
from collections import defaultdict
_usage = defaultdict(int); _lock = threading.Lock()
def record_usage(plan_name: str, endpoint: str):
    with _lock:
        _usage[f"{plan_name}:{endpoint}"] += 1
def snapshot_usage():
    with _lock: return dict(_usage)

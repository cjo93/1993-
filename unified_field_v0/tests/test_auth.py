import pytest
from fastapi.testclient import TestClient
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app

client = TestClient(app)

def test_healthz_unauthenticated():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_home_unauthenticated():
    response = client.get("/")
    assert response.status_code == 401
    assert response.json() == {"detail": "Missing x-api-key"}

def test_home_authenticated():
    response = client.get("/", headers={"x-api-key": "free-demo-key"})
    assert response.status_code == 200
    assert "<h1>DEFRAG API</h1>" in response.text
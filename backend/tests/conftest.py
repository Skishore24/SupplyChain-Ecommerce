import pytest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session")
def admin_token(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@shopera.com",
        "password": "Admin@Shopera2026!"
    })
    assert res.status_code == 200
    return res.json()["data"]["access_token"]

@pytest.fixture(scope="session")
def customer_token(client):
    res = client.post("/api/auth/login", json={
        "email": "sarah.jenkins@example.com",
        "password": "Customer@1234"
    })
    assert res.status_code == 200
    return res.json()["data"]["access_token"]

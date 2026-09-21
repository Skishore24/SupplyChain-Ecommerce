import secrets

def test_login_success(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@shopera.com",
        "password": "Admin@Shopera2026!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["role"] == "ADMIN"

def test_login_invalid_password(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@shopera.com",
        "password": "WrongPassword123!"
    })
    assert res.status_code == 401

def test_register_duplicate_email(client):
    res = client.post("/api/auth/register", json={
        "first_name": "Test",
        "last_name": "User",
        "email": "sarah.jenkins@example.com",
        "password": "ValidPassword123!",
        "confirm_password": "ValidPassword123!"
    })
    assert res.status_code == 400

def test_register_weak_password(client):
    res = client.post("/api/auth/register", json={
        "first_name": "Test",
        "last_name": "User",
        "email": f"test_{secrets.token_hex(4)}@example.com",
        "password": "short",
        "confirm_password": "short"
    })
    assert res.status_code == 422

def test_register_success(client):
    test_email = f"user_{secrets.token_hex(4)}@example.com"
    res = client.post("/api/auth/register", json={
        "first_name": "New",
        "last_name": "Customer",
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["email"] == test_email


def test_customer_forbidden_from_admin_dashboard(client, customer_token):
    res = client.get(
        "/api/admin/dashboard",
        headers={"Authorization": f"Bearer {customer_token}"}
    )
    assert res.status_code == 403
    assert "Admin privileges required" in res.json()["message"]

def test_admin_allowed_on_admin_dashboard(client, admin_token):
    res = client.get(
        "/api/admin/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "metrics" in data["data"]
    assert "revenue" in data["data"]["metrics"]

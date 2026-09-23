def test_admin_dashboard_metrics(client, admin_token):
    res = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    metrics = data["data"]["metrics"]
    assert "revenue" in metrics
    assert "orders" in metrics
    assert "customers" in metrics
    assert "products" in metrics
    assert "aov" in metrics
    assert metrics["revenue"]["current_value"] >= 0
    assert metrics["aov"]["current_value"] >= 0

def test_admin_dashboard_periods(client, admin_token):
    for period in ["7days", "30days", "3months", "1year"]:
        res = client.get(f"/api/admin/dashboard?period={period}", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        assert res.json()["success"] is True

def test_admin_analytics_routes(client, admin_token):
    for path in ["revenue", "orders", "customers", "categories"]:
        res = client.get(f"/api/admin/analytics/{path}", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        assert res.json()["success"] is True

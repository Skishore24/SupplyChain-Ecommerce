def test_get_products_list(client):
    res = client.get("/api/products?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]["items"]) > 0
    assert data["data"]["total"] >= 30

def test_filter_products_by_category(client):
    res = client.get("/api/products?category=audio-and-sound")
    assert res.status_code == 200
    data = res.json()
    for item in data["data"]["items"]:
        assert item["category"]["slug"] == "audio-and-sound"

def test_search_products(client):
    res = client.get("/api/products?search=Aether")
    assert res.status_code == 200
    data = res.json()
    assert len(data["data"]["items"]) >= 1
    assert "Aether" in data["data"]["items"][0]["name"]

def test_get_product_by_slug(client):
    res = client.get("/api/products/slug/aether-pro-wireless-anc-headphones")
    assert res.status_code == 200
    data = res.json()
    assert data["data"]["sku"] == "AUD-AET-001"
    assert len(data["data"]["images"]) >= 1

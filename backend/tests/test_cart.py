def test_cart_lifecycle(client, customer_token):
    headers = {"Authorization": f"Bearer {customer_token}"}
    
    # 1. Clear cart
    client.delete("/api/cart", headers=headers)
    
    # 2. Get initial cart
    res = client.get("/api/cart", headers=headers)
    assert res.status_code == 200
    assert res.json()["data"]["item_count"] == 0

    # 3. Add item (Product 1)
    res_add = client.post("/api/cart/items", json={"product_id": 1, "quantity": 2}, headers=headers)
    assert res_add.status_code == 200
    cart = res_add.json()["data"]
    assert cart["item_count"] == 2
    assert len(cart["items"]) == 1
    item_id = cart["items"][0]["id"]

    # 4. Update quantity
    res_up = client.put(f"/api/cart/items/{item_id}", json={"quantity": 3}, headers=headers)
    assert res_up.status_code == 200
    assert res_up.json()["data"]["item_count"] == 3

    # 5. Prevent exceeding stock
    res_excess = client.put(f"/api/cart/items/{item_id}", json={"quantity": 999999}, headers=headers)
    assert res_excess.status_code == 400

    # 6. Apply valid coupon
    res_coupon = client.get("/api/cart?coupon_code=SHOPERA10", headers=headers)
    assert res_coupon.status_code == 200
    assert float(res_coupon.json()["data"]["discount"]) > 0

    # 7. Remove item
    res_del = client.delete(f"/api/cart/items/{item_id}", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["data"]["item_count"] == 0

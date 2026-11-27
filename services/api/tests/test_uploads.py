import re


def test_presign_returns_regional_put_url_for_new_upload_key(client):
    res = client.post("/upload-url", json={})

    assert res.status_code == 200
    body = res.json()
    assert re.fullmatch(r"uploads/[0-9a-f-]{36}\.mp4", body["key"])
    # Regional virtual-host URL: the global endpoint 307-redirects for new buckets
    assert body["url"].startswith(f"https://test-bucket.s3.eu-central-1.amazonaws.com/{body['key']}?")
    assert "X-Amz-Signature=" in body["url"]

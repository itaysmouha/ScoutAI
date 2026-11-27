import re

import pytest


@pytest.mark.parametrize("content_type, ext", [("video/quicktime", ".mov"), ("video/webm", ".webm")])
def test_presign_key_extension_follows_content_type(client, content_type, ext):
    res = client.post("/upload-url", json={"content_type": content_type})

    assert res.json()["key"].endswith(ext)


def test_presign_rejects_non_video_content_type(client):
    assert client.post("/upload-url", json={"content_type": "image/png"}).status_code == 400


def test_presign_returns_regional_put_url_for_new_upload_key(client):
    res = client.post("/upload-url", json={})

    assert res.status_code == 200
    body = res.json()
    assert re.fullmatch(r"uploads/[0-9a-f-]{36}\.mp4", body["key"])
    # Regional virtual-host URL: the global endpoint 307-redirects for new buckets
    assert body["url"].startswith(f"https://test-bucket.s3.eu-central-1.amazonaws.com/{body['key']}?")
    assert "X-Amz-Signature=" in body["url"]

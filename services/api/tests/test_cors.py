import pytest


@pytest.mark.parametrize("origin", ["http://allowed.example", "http://also-allowed.example"])
def test_cors_allows_origins_from_env(client, origin):
    res = client.get("/", headers={"Origin": origin})

    assert res.headers["access-control-allow-origin"] == origin


def test_cors_rejects_other_origins(client):
    res = client.get("/", headers={"Origin": "http://evil.example"})

    assert "access-control-allow-origin" not in res.headers

"""Error sanitization can be verified without loading authentication libraries."""
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict

from app.errors import APIError, install_error_handlers


def test_safe_error_envelopes():
    app = FastAPI()
    install_error_handlers(app)

    class Body(BaseModel):
        model_config = ConfigDict(extra="forbid")
        password: str

    @app.post("/validate")
    def validate(body: Body):
        return {}

    @app.get("/unexpected")
    def unexpected():
        raise RuntimeError("private-internal-value")

    @app.get("/http")
    def http():
        raise HTTPException(400, detail="private-internal-value")

    @app.get("/domain")
    def domain():
        raise APIError(409, "conflict", "Conflict.")

    with TestClient(app, raise_server_exceptions=False) as client:
        responses = [
            client.post("/validate", json={"password": {"private-internal-value": True}}),
            client.post("/validate", content='{"password":"private-internal-value",'),
            client.get("/missing"), client.get("/unexpected"), client.get("/http"), client.get("/domain"),
        ]
        assert [r.status_code for r in responses] == [422, 422, 404, 500, 400, 409]
        for response in responses:
            assert set(response.json()) == {"error"}
            assert "private-internal-value" not in response.text
            assert response.headers["cache-control"] == "no-store"

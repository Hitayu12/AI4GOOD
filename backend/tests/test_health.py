from fastapi.testclient import TestClient

from app.main import create_app


def test_health_and_published_schema():
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        assert response.headers["content-type"] == "application/json"
        schema = client.get("/openapi.json").json()
        operation = schema["paths"]["/api/v1/health"]["get"]
        assert operation["responses"]["200"]["content"]["application/json"]["schema"] == {
            "$ref": "#/components/schemas/HealthResponse"
        }
        assert client.get("/docs").status_code == 200


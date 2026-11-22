import pytest
from fastapi.testclient import TestClient

from api import main
from markov_calls.actions import ACTION_IDS
from markov_calls.model import MAX_SEQUENCE_LENGTH


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as test_client:
        yield test_client


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_actions_catalog(client):
    body = client.get("/api/actions").json()
    assert [a["id"] for a in body["actions"]] == list(ACTION_IDS)
    categories = {c["id"] for c in body["categories"]}
    assert all(a["category"] in categories for a in body["actions"])
    assert {a["kind"] for a in body["actions"]} == {"regular", "failure", "help"}


def test_model_summary(client):
    body = client.get("/api/model").json()
    assert [g["id"] for g in body["groups"]] == ["non_callers", "callers"]
    assert sum(g["training_users"] for g in body["groups"]) == 20_000
    assert body["max_sequence_length"] == MAX_SEQUENCE_LENGTH


def test_patterns_have_true_and_learned_matrices(client):
    body = client.get("/api/patterns").json()
    size = len(ACTION_IDS)
    for source in ("true", "learned"):
        for group in ("non_callers", "callers"):
            matrix = body[source][group]["transitions"]
            assert len(matrix) == size and all(len(row) == size for row in matrix)
            assert all(abs(sum(row) - 1) < 1e-4 for row in matrix)
    assert "transition_counts" in body["learned"]["callers"]
    assert body["typical_for"]["fx_transfer_failed"] == "callers"


def test_predict_returns_prediction_and_explanation(client):
    response = client.post("/api/predict", json={"actions": ["login", "fx_transfer_attempt", "fx_transfer_failed"]})
    assert response.status_code == 200
    body = response.json()
    assert body["predicted"] == "callers"
    assert body["evidence"] in {"weak", "moderate", "strong"}
    assert len(body["steps"]) == 3


@pytest.mark.parametrize("payload, fragment", [
    ({"actions": []}, "at least 1"),
    ({"actions": ["login", "logout"]}, "Unknown action 'logout'"),
    ({"actions": ["login"] * (MAX_SEQUENCE_LENGTH + 1)}, "at most"),
    ({}, "Field required"),
])
def test_predict_rejects_bad_input(client, payload, fragment):
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 422
    assert fragment in response.text


def test_performance(client):
    body = client.get("/api/performance").json()
    assert body["test_set"]["users"] == 10_000
    assert len(body["budget"]["captured_model"]) == body["budget"]["max_k"]
    assert len(body["score_histogram"]["edges"]) == len(body["score_histogram"]["callers"]) + 1


def test_unknown_api_path_is_json_404(client):
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert response.json()["detail"].startswith("Unknown API endpoint")


def test_frontend_routes_fall_back_to_index(client, tmp_path, monkeypatch):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<html>app</html>")
    (tmp_path / "assets" / "app.js").write_text("console.log(1)")
    monkeypatch.setattr(main, "FRONTEND_DIST", tmp_path)
    assert client.get("/predict").text == "<html>app</html>"
    asset = client.get("/assets/app.js")
    assert asset.text == "console.log(1)" and "immutable" in asset.headers["cache-control"]
    assert client.get("/../backend/api/main.py").text == "<html>app</html>"


def test_missing_frontend_build_is_explained(client, tmp_path, monkeypatch):
    monkeypatch.setattr(main, "FRONTEND_DIST", tmp_path / "missing")
    response = client.get("/")
    assert response.status_code == 503
    assert "npm run build" in response.json()["detail"]

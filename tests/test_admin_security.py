from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.main import app
from backend.routers import admin

client = TestClient(app)


def test_spec_id_rejects_path_traversal() -> None:
    with pytest.raises(ValueError):
        admin.SpecExecutionRequest(specId="../../outside")


def test_training_data_must_be_inside_allowlisted_directory(tmp_path: Path) -> None:
    outside = tmp_path / "outside.csv"
    outside.write_text("text,label\nexample,0\n", encoding="utf-8")

    with pytest.raises(HTTPException) as exc:
        admin._training_data_file(str(outside))

    assert exc.value.status_code == 400


def test_admin_dependency_rejects_non_admin() -> None:
    class User:
        role = "user"

    class Auth:
        user = User()

    with pytest.raises(HTTPException) as exc:
        admin.require_admin(Auth())  # type: ignore[arg-type]

    assert exc.value.status_code == 403


def test_admin_api_requires_admin_session() -> None:
    assert client.get("/admin/specs").status_code == 401

    login = client.post(
        "/v1/auth/login",
        json={"email": "demo@aisec.local", "password": "Demo@123456"},
    )
    assert login.status_code == 200
    token = login.json()["token"]

    response = client.get("/admin/specs", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_training_request_accepts_only_one_model_per_dataset() -> None:
    with pytest.raises(ValueError):
        admin.ModelTrainingRequest(
            dataPath="data/demo_text_training.csv",
            models=["text", "url"],
        )

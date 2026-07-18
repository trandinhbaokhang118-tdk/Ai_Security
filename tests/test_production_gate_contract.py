from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def test_production_image_uses_runtime_only_dependencies_and_fail_closed_health() -> None:
    dockerfile = (ROOT / "Dockerfile.backend").read_text(encoding="utf-8")
    runtime_requirements = (ROOT / "requirements.runtime.txt").read_text(encoding="utf-8")
    development_requirements = (ROOT / "requirements.txt").read_text(encoding="utf-8")
    backend_ignore = (ROOT / "Dockerfile.backend.dockerignore").read_text(
        encoding="utf-8"
    )

    assert "requirements.runtime.txt" in dockerfile
    assert "requirements.txt ./" not in dockerfile
    assert "pytest" not in runtime_requirements.lower()
    assert "-r requirements.runtime.txt" in development_requirements
    assert "--only-shell chromium" in dockerfile
    assert "http://localhost:8000/v1/ready" in dockerfile
    assert "frontend" in backend_ignore.splitlines()
    assert not (ROOT / ".dockerignore").exists()


def test_ci_production_gate_covers_migrations_and_runtime_readiness() -> None:
    workflow_text = (ROOT / ".github" / "workflows" / "ci.yml").read_text(
        encoding="utf-8"
    )
    workflow = yaml.safe_load(workflow_text)
    production_gate = workflow["jobs"]["production-gate"]
    rendered_steps = "\n".join(
        str(value)
        for step in production_gate["steps"]
        for value in step.values()
    )

    assert set(production_gate["needs"]) == {"backend", "web"}
    assert "alembic downgrade base" in rendered_steps
    assert "alembic upgrade head" in rendered_steps
    assert "/v1/ready" in rendered_steps
    assert "down -v --remove-orphans" in rendered_steps

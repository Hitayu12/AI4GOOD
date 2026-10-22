import pytest

from app.config import load_settings


def test_name_from_environment(monkeypatch):
    monkeypatch.setenv("AI4GOOD_APP_NAME", " Test API ")
    assert load_settings().app_name == "Test API"


@pytest.mark.parametrize("name", [" ", "x" * 101])
def test_invalid_name(monkeypatch, name):
    monkeypatch.setenv("AI4GOOD_APP_NAME", name)
    with pytest.raises(ValueError):
        load_settings()


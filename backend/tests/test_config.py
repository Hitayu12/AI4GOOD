import pytest

from app.config import Settings, load_settings


def test_name_from_environment(monkeypatch):
    monkeypatch.setenv("AI4GOOD_APP_NAME", " Test API ")
    assert load_settings().app_name == "Test API"


@pytest.mark.parametrize("name", [" ", "x" * 101])
def test_invalid_name(monkeypatch, name):
    monkeypatch.setenv("AI4GOOD_APP_NAME", name)
    with pytest.raises(ValueError):
        load_settings()


def test_auth_settings_from_environment(monkeypatch):
    monkeypatch.setenv("AUTH_TOKEN_TTL_SECONDS", "120")
    monkeypatch.setenv("LOGIN_MAX_ATTEMPTS", "3")
    monkeypatch.setenv("LOGIN_WINDOW_SECONDS", "30")
    config = load_settings()
    assert (config.auth_token_ttl_seconds, config.login_max_attempts,
            config.login_window_seconds) == (120, 3, 30)


@pytest.mark.parametrize("name,value", [
    ("auth_token_ttl_seconds", 0), ("auth_token_ttl_seconds", 86401),
    ("login_max_attempts", 0), ("login_max_attempts", 1001),
    ("login_window_seconds", 0), ("login_window_seconds", 3601),
    ("auth_token_ttl_seconds", True),
])
def test_auth_setting_bounds(name, value):
    with pytest.raises(ValueError):
        Settings(**{name: value})


def test_invalid_auth_environment(monkeypatch):
    monkeypatch.setenv("LOGIN_MAX_ATTEMPTS", "not-an-integer")
    with pytest.raises(ValueError):
        load_settings()


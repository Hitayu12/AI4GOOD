"""Real HTTP auth smoke check using a temporary DB; never prints credentials."""
from contextlib import contextmanager
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import time

import httpx


ROOT = Path(__file__).resolve().parents[1]


@contextmanager
def running_server(env):
    # Reserve the socket and pass it to Uvicorn, avoiding port-selection races.
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen()
        port = listener.getsockname()[1]
        server = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "app.main:app", "--fd", str(listener.fileno()),
            "--no-proxy-headers", "--no-access-log", "--log-level", "warning",
        ], cwd=ROOT, env=env, pass_fds=(listener.fileno(),))
        try:
            with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=5,
                              trust_env=False) as client:
                for _ in range(100):
                    if server.poll() is not None:
                        raise RuntimeError("API exited before startup; inspect dependency/setup errors above.")
                    try:
                        if client.get("/api/v1/health").status_code == 200:
                            break
                    except httpx.TransportError:
                        pass
                    time.sleep(0.1)
                else:
                    raise RuntimeError("API startup timed out.")
                yield client
        finally:
            if server.poll() is None:
                server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait()


def check(condition, message):
    if not condition:
        raise RuntimeError(message)


def main():
    with tempfile.TemporaryDirectory(prefix="ai4good-auth-") as folder:
        env = dict(os.environ, DATABASE_URL=f"sqlite:///{folder}/auth.db",
                   LOGIN_MAX_ATTEMPTS="100", LOGIN_WINDOW_SECONDS="60", AUTH_TOKEN_TTL_SECONDS="3600")
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"],
                       cwd=ROOT, env=env, check=True)
        password = secrets.token_urlsafe(24)
        users, tokens = [], []
        with running_server(env) as client:
            for email in ["smoke-first@example.com", "smoke-second@example.com"]:
                body = {"email": email, "password": password}
                result = client.post("/api/v1/auth/register", json=body)
                check(result.status_code == 201, "Registration failed.")
                users.append(result.json()["user"])
                result = client.post("/api/v1/auth/login", json=body)
                check(result.status_code == 200, "Login failed.")
                tokens.append(result.json()["access_token"])
            for user, token in zip(users, tokens):
                result = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
                check(result.status_code == 200 and result.json() == user, "Current-user separation failed.")
            check(client.get("/api/v1/auth/me").status_code == 401, "Missing token was accepted.")
        with running_server(env) as client:
            for user, token in zip(users, tokens):
                result = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
                check(result.status_code == 200 and result.json() == user, "Restart persistence failed.")
            result = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {tokens[0]}"})
            check(result.status_code == 204 and not result.content, "Logout failed.")
        with running_server(env) as client:
            for token, status in zip(tokens, [401, 200]):
                result = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
                check(result.status_code == status, "Revocation persistence or user separation failed.")
        print("PASS: auth HTTP flow, two users, restart persistence, and persisted logout.")


if __name__ == "__main__":
    main()

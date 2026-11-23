# Rutgers AI4Good 2026 — Production Deployment & Persistence Guide (Phase 10)

## 1. Deployment Topology & Invariants

```
               [ Client Browser / Assistive Tech ]
                              │
                    Port 80 (HTTP / HTTPS)
                              ▼
            ┌──────────────────────────────────┐
            │       Nginx Reverse Proxy        │  (ai4good-frontend container)
            │   - Hardened Security Headers    │
            │   - SPA Fallback (/index.html)   │
            │   - Long-term /assets/ Caching   │
            └──────────────┬───────────────────┘
                           │  Proxy: /api/v1/*
                           ▼
            ┌──────────────────────────────────┐
            │        FastAPI Application       │  (ai4good-backend container)
            │   - Uvicorn (Single Worker)      │
            │   - Idempotency & Auth Checks    │
            │   - Tutor Curriculum Engine      │
            └──────────────┬───────────────────┘
                           │
                 /data/ai4good.db (File I/O)
                           ▼
            ┌──────────────────────────────────┐
            │   Durable Named Docker Volume    │  (ai4good_sqlite_data)
            │   - Survives container restarts  │
            │   - Never stored on disposable   │
            └──────────────────────────────────┘
```

### Invariants:
1. **Durable Persistence**: SQLite database is stored on the dedicated named volume `ai4good_sqlite_data` mounted at `/data/ai4good.db`. It is **never** placed on container-ephemeral file layers.
2. **Single-Writer Safety**: Uvicorn runs with `--workers 1` to prevent concurrent write locks on SQLite.
3. **Security Headers**: Nginx enforces `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
4. **Session Isolation**: Cross-Origin Resource Sharing (CORS) is restricted to configured origins in `.env`.

---

## 2. Deployment Runbook

### Step 1: Environment Setup
Copy the template and configure your secrets:
```bash
cp deployment/.env.example deployment/.env
```
Generate a secure random secret key:
```bash
openssl rand -hex 32
```
Paste this value into `SECRET_KEY` inside `deployment/.env`.

### Step 2: Build & Start Containers
From the repository root:
```bash
docker compose -f deployment/docker-compose.yml up -d --build
```

### Step 3: Verify Container Health
Check that both frontend and backend report healthy status:
```bash
docker compose -f deployment/docker-compose.yml ps
```
Both `ai4good-backend` and `ai4good-frontend` should indicate `(healthy)`.

---

## 3. Post-Deployment Verification Checklist

Follow these 4 manual verification steps against the running deployment:

### Test 1: API Health Check
```bash
curl -i http://localhost:80/api/v1/health
```
**Expected**: `HTTP/1.1 200 OK` with JSON `{"status":"ok"}`.

### Test 2: Two-User Separation Test
1. Register user A (`student1@rutgers.edu`) via `POST /api/v1/auth/register`.
2. Register user B (`student2@rutgers.edu`).
3. User A creates a simulation `sim_user_a`.
4. Request `GET /api/v1/simulations` authenticated as User B.
5. **Expected**: User B's simulation list does NOT contain `sim_user_a` (strict ownership enforcement).

### Test 3: Core Simulation & Trade Advance
1. Create an order for AAPL whole shares under an active simulation.
2. Advance simulation session via `POST /api/v1/simulations/{id}/advance`.
3. Verify order fills at the next session OPEN price and portfolio equity curve updates.

### Test 4: Save & Restart Persistence Test
Simulate a host restart or deployment update:
```bash
docker compose -f deployment/docker-compose.yml down
docker compose -f deployment/docker-compose.yml up -d
```
Log in as User A and query `GET /api/v1/simulations`:
**Expected**: All user data, simulation state, order history, and portfolio P&L are completely preserved from the persistent SQLite volume.

---

## 4. Rollback & Disaster Recovery Procedures

If a faulty build or migration issue is detected in production:

### 1. Instant Container Rollback
```bash
# Revert to previous image tag or commit
git checkout HEAD~1
docker compose -f deployment/docker-compose.yml up -d --build
```

### 2. Database Backup & Restore
- **Backup**:
  ```bash
  docker run --rm -v ai4good_sqlite_data:/data -v $(pwd)/backups:/backup alpine \
    cp /data/ai4good.db /backup/ai4good_backup_$(date +%Y%m%d_%H%M%S).db
  ```
- **Restore**:
  ```bash
  docker compose -f deployment/docker-compose.yml stop backend
  docker run --rm -v ai4good_sqlite_data:/data -v $(pwd)/backups:/backup alpine \
    cp /backup/ai4good_backup_TARGET.db /data/ai4good.db
  docker compose -f deployment/docker-compose.yml start backend
  ```

---

## 5. Cloud Target Readiness

All Docker configurations are target-agnostic and production-ready for deployment on:
- **Render / Railway / Fly.io**: Connect repository, deploy using `deployment/docker-compose.yml`, and attach a persistent volume to `/data`.
- **AWS EC2 / DigitalOcean Droplet**: Clone repository onto host, run `docker compose up -d`, and configure an SSL certificate via Certbot/Let's Encrypt.

> **Smallest Action to Deploy Live**: User authorization and provision of target host credentials (e.g., cloud provider API token or SSH host access). In the absence of an authorized live cloud host, deployment artifacts have been verified locally.

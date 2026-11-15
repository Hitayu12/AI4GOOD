"""CORS boundary, documented schemas, and consistent read snapshots."""
from dataclasses import replace
import json

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import event

from app.config import Settings, load_settings
from app.main import create_app
from test_simulations import rig
from test_trading import get


def test_explicit_cors_preflight_and_errors():
    app=create_app(Settings(database_url='sqlite://',allowed_origins=('http://localhost:5173',)))
    with TestClient(app) as client:
        headers={'Origin':'http://localhost:5173','Access-Control-Request-Method':'POST',
                 'Access-Control-Request-Headers':'authorization,content-type,idempotency-key'}
        allowed=client.options('/api/v1/simulations',headers=headers)
        assert allowed.status_code==200
        assert allowed.headers['access-control-allow-origin']=='http://localhost:5173'
        assert 'access-control-allow-credentials' not in allowed.headers
        for origin in ['http://evil.example','http://localhost:51730','null']:
            denied=client.options('/api/v1/simulations',headers={**headers,'Origin':origin})
            assert denied.status_code==400 and 'access-control-allow-origin' not in denied.headers
        error=client.get('/api/v1/progress',headers={'Origin':'http://localhost:5173'})
        assert error.status_code==401 and error.headers['access-control-allow-origin']=='http://localhost:5173'
        assert error.headers['cache-control']=='no-store'


@pytest.mark.parametrize('origin',['*','https://*.example.com','file:///tmp','https://example.com/path','https://example.com/','https://user:pass@example.com','https://example.com?x=1','https://example.com:99999'])
def test_invalid_origins(origin):
    with pytest.raises(ValueError):Settings(allowed_origins=(origin,))


def test_cors_environment(monkeypatch):
    monkeypatch.setenv('ALLOWED_ORIGINS','http://localhost:5173, https://example.com')
    assert load_settings().allowed_origins==('http://localhost:5173','https://example.com')
    assert Settings().allowed_origins==()


def test_all_backend_core_routes_and_no_private_openapi_fields(rig):
    schema=rig.client.get('/openapi.json').json()
    for path in ['/simulations/{simulation_id}/orders','/simulations/{simulation_id}/transactions',
                 '/simulations/{simulation_id}/portfolio','/simulations/{simulation_id}/performance',
                 '/lessons','/lessons/{lesson_id}','/quizzes/{quiz_id}','/quizzes/{quiz_id}/attempts','/progress']:
        assert '/api/v1'+path in schema['paths']
    assert set(schema['components']['schemas']['Quiz']['properties'])=={'id','version','lesson_id','questions'}
    for private in ['password_hash','token_hash','answerKey','definition_sha256','allocated_cost_cents']:
        assert private not in json.dumps(schema)
    for path in ['/api/v1/simulations/{simulation_id}/orders','/api/v1/quizzes/{quiz_id}/attempts']:
        operation=schema['paths'][path]['post']
        assert any(p['name']=='Idempotency-Key' and p['required'] for p in operation['parameters'])


def test_get_routes_open_real_sqlite_read_transaction(rig):
    sim=rig.create().json()
    seen=[]
    def record(conn,cursor,statement,params,context,many):
        if statement=='BEGIN': seen.append(True)
    event.listen(rig.app.state.engine,'before_cursor_execute',record)
    try:
        assert get(rig,sim,'portfolio').status_code==200
    finally:
        event.remove(rig.app.state.engine,'before_cursor_execute',record)
    assert seen


@pytest.mark.parametrize('name,model',[
    ('orders','OrderList'),('transactions','TransactionList'),('portfolio','PortfolioResponse'),('performance','PerformanceResponse')])
def test_financial_handoff_fixtures_match_models(name,model):
    from pathlib import Path
    from app import simulations
    payload=json.loads((Path(__file__).resolve().parents[2]/'docs/fixtures'/f'{name}.json').read_text())
    getattr(simulations,model).model_validate(payload)


@pytest.mark.parametrize('name,model',[
    ('lessons','LessonList'),('lesson','Lesson'),('quiz','Quiz'),('quiz-attempt','AttemptResponse'),('progress','ProgressResponse')])
def test_learning_handoff_fixtures_match_models(name,model):
    from pathlib import Path
    from app import learning
    payload=json.loads((Path(__file__).resolve().parents[2]/'docs/fixtures'/f'{name}.json').read_text())
    getattr(learning,model).model_validate(payload)


def test_curriculum_provenance_hash():
    from hashlib import sha256
    from pathlib import Path
    folder=Path(__file__).resolve().parents[1]/'data/curriculum'
    provenance=json.loads((folder/'PROVENANCE.json').read_text())
    assert sha256((folder/'kiran-v1.json').read_bytes()).hexdigest()==provenance['artifact_sha256']

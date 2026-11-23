"""Real curriculum delivery, private scoring, progress versions and atomic retries."""
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from sqlalchemy import event, func, select

from app.learning import Catalog, load_catalog
from app.models import QuizAttempt
from test_simulations import rig

QUIZ='quiz-cd-basics'


def payload(rig, correct=4):
    catalog=rig.app.state.catalog
    quiz=catalog.quizzes[QUIZ]
    scoring=catalog.scoring[QUIZ]
    return {'quiz_version':quiz.version,'answers':[
        {'question_id':q.id,'option_id':scoring.answerKey[q.id] if i<correct else next(o.id for o in q.options if o.id!=scoring.answerKey[q.id])}
        for i,q in enumerate(quiz.questions)]}


def submit(rig, body=None, key=None, headers=None):
    return rig.client.post(f'/api/v1/quizzes/{QUIZ}/attempts', json=payload(rig) if body is None else body,
        headers={**(rig.first if headers is None else headers),'Idempotency-Key':key or str(uuid4())})


def progress(rig, headers=None):
    result=rig.client.get('/api/v1/progress',headers=rig.first if headers is None else headers)
    assert result.status_code==200,result.text
    return next(x for x in result.json()['items'] if x['lesson_id']=='cd-basics')


def test_actual_five_topic_catalog_and_no_answer_keys(rig):
    result=rig.client.get('/api/v1/lessons',headers=rig.first)
    assert result.status_code==200
    assert len(result.json()['items'])==5
    for summary in result.json()['items']:
        response=rig.client.get('/api/v1/lessons/'+summary['id'],headers=rig.first)
        assert response.status_code==200
        lesson=response.json()
        assert lesson['review_status']=='draft' and lesson['body'] and lesson['source_links']
        q=rig.client.get('/api/v1/quizzes/'+lesson['quiz_id'],headers=rig.first)
        assert q.status_code==200
        for forbidden in ['answerKey','explanations','correct','score_bp','definition_sha256']:
            assert forbidden not in q.json()
        for question in q.json()['questions']:
            assert set(question)=={'id','prompt','options'}
            assert all(set(o)=={'id','text'} for o in question['options'])
    assert progress(rig)['attempt_count']==0
    assert rig.client.get('/api/v1/lessons/absent',headers=rig.first).status_code==404
    assert rig.client.get('/api/v1/quizzes/absent',headers=rig.first).status_code==404


def test_scoring_best_latest_replay_and_user_isolation(rig):
    first=submit(rig,key='once')
    assert first.status_code==200,first.text
    assert first.json()['passed'] and first.json()['score_pct']=='100.00'
    assert submit(rig,key='once').content==first.content
    failed=submit(rig,payload(rig,3))
    assert failed.json()['score_pct']=='75.00' and not failed.json()['passed']
    p=progress(rig)
    assert p['attempt_count']==2 and p['best_score_pct']=='100.00' and p['latest_score_pct']=='75.00' and p['completed']
    assert progress(rig,rig.second)['attempt_count']==0
    assert submit(rig,payload(rig,3),key='once').status_code==409


@pytest.mark.parametrize('kind',['missing','duplicate','unknown_question','unknown_option','extra','client_score','stale','boolean_version'])
def test_invalid_attempts(rig,kind):
    body=payload(rig)
    if kind=='missing': body['answers'].pop()
    if kind=='duplicate': body['answers'][1]=body['answers'][0]
    if kind=='unknown_question': body['answers'][0]['question_id']='unknown'
    if kind=='unknown_option': body['answers'][0]['option_id']='unknown'
    if kind=='extra': body['answers'][0]['extra']=True
    if kind=='client_score': body['score_pct']='100.00'
    if kind=='stale': body['quiz_version']=2
    if kind=='boolean_version': body['quiz_version']=True
    assert submit(rig,body).status_code==(409 if kind=='stale' else 422)
    assert progress(rig)['attempt_count']==0


def test_exact_eighty_percent_boundary_and_new_version(rig):
    catalog=rig.app.state.catalog.model_dump(mode='json')
    q=catalog['quizzes'][QUIZ]
    fifth={**q['questions'][0], 'id':'q5'}
    q['questions'].append(fifth)
    catalog['scoring'][QUIZ]['answerKey']['q5']='opt_b'
    catalog['scoring'][QUIZ]['explanations']['q5']='Test-only boundary question.'
    rig.app.state.catalog=Catalog.model_validate(catalog)
    result=submit(rig,payload(rig,4),key='boundary')
    assert result.json()['score_pct']=='80.00' and result.json()['passed']
    assert progress(rig)['completed']
    old_body=payload(rig,4)
    rig.app.state.catalog.quizzes[QUIZ].version=2
    assert not progress(rig)['completed'] and progress(rig)['attempt_count']==0
    assert submit(rig,old_body,key='boundary').content==result.content
    assert submit(rig,old_body).status_code==409


def test_version_mutation_is_detected(rig):
    assert submit(rig).status_code==200
    rig.app.state.catalog.quizzes[QUIZ].questions[0].prompt='Changed without version bump'
    assert submit(rig).status_code==503
    assert rig.client.get('/api/v1/progress',headers=rig.first).status_code==503


def test_concurrent_attempt_retry_and_rollback(rig):
    with ThreadPoolExecutor(2) as pool:
        responses=list(pool.map(lambda _:submit(rig,key='concurrent'),range(2)))
    assert all(r.status_code==200 for r in responses)
    assert responses[0].content==responses[1].content
    assert progress(rig)['attempt_count']==1
    def fail(conn,cursor,statement,params,context,many):
        if statement.startswith('INSERT INTO idempotency_receipts'): raise RuntimeError('injected')
    event.listen(rig.app.state.engine,'before_cursor_execute',fail)
    try:
        assert submit(rig,key='failed').status_code==500
    finally:
        event.remove(rig.app.state.engine,'before_cursor_execute',fail)
    assert progress(rig)['attempt_count']==1
    assert submit(rig,key='failed').status_code==200
    assert progress(rig)['attempt_count']==2


def test_learning_requires_auth_and_key(rig):
    for path in ['/lessons','/lessons/cd-basics','/quizzes/'+QUIZ,'/progress']:
        assert rig.client.get('/api/v1'+path).status_code==401
    assert submit(rig,headers={}).status_code==401
    assert rig.client.post(f'/api/v1/quizzes/{QUIZ}/attempts',json=payload(rig),headers=rig.first).status_code==422


def test_catalog_rejects_invalid_scoring():
    catalog=load_catalog().model_dump(mode='json')
    catalog['scoring'][QUIZ]['answerKey']['q1']='not-an-option'
    with pytest.raises(ValueError): Catalog.model_validate(catalog)

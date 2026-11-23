"""Versioned public curriculum and private, idempotent server scoring."""
from decimal import Decimal
from hashlib import sha256
import json
from pathlib import Path as FilePath
from typing import Annotated, Literal

from fastapi import APIRouter, Path, Request, Response
from pydantic import Field, HttpUrl, model_validator
from sqlalchemy import select

from app.auth import DatabaseSession
from app.errors import APIError, ErrorResponse
from app.models import QuizAttempt
from app.simulations import (CurrentUser, IdempotencyKey, StrictModel, Money,
    money_string, replay, request_fingerprint, round_cents, save_receipt, simulation_write)

ContentID = Annotated[str, Field(strict=True, min_length=1, max_length=64, pattern=r'^[a-z0-9][a-z0-9_-]*$')]
ContentPath = Annotated[str, Path(min_length=1, max_length=64, pattern=r'^[a-z0-9][a-z0-9_-]*$')]
ContentVersion = Annotated[int, Field(strict=True, ge=1, le=1000000)]


class LessonSummary(StrictModel):
    id: ContentID
    version: ContentVersion
    title: str = Field(min_length=1, max_length=200)
    topic: str = Field(min_length=1, max_length=100)


class Lesson(LessonSummary):
    body: str = Field(min_length=1, max_length=50000)
    source_links: list[HttpUrl] = Field(min_length=1, max_length=20)
    review_status: Literal['draft', 'reviewed']
    quiz_id: ContentID


class Option(StrictModel):
    id: ContentID
    text: str = Field(min_length=1, max_length=2000)


class Question(StrictModel):
    id: ContentID
    prompt: str = Field(min_length=1, max_length=2000)
    options: list[Option] = Field(min_length=2, max_length=10)


class Quiz(StrictModel):
    id: ContentID
    version: ContentVersion
    lesson_id: ContentID
    questions: list[Question] = Field(min_length=1, max_length=100)


class Scoring(StrictModel):
    answerKey: dict[str, str]
    explanations: dict[str, str]


class Catalog(StrictModel):
    lessons: dict[str, Lesson]
    quizzes: dict[str, Quiz]
    scoring: dict[str, Scoring]

    @model_validator(mode='after')
    def consistent(self):
        if not 1 <= len(self.lessons) <= 100 or len(self.lessons) != len(self.quizzes) or set(self.quizzes) != set(self.scoring):
            raise ValueError('Invalid curriculum catalog.')
        for key, lesson in self.lessons.items():
            quiz = self.quizzes.get(lesson.quiz_id)
            if key != lesson.id or quiz is None or quiz.lesson_id != key:
                raise ValueError('Invalid lesson/quiz linkage.')
        for key, quiz in self.quizzes.items():
            ids = [q.id for q in quiz.questions]
            score = self.scoring[key]
            if key != quiz.id or len(set(ids)) != len(ids) or set(ids) != set(score.answerKey) or set(ids) != set(score.explanations):
                raise ValueError('Invalid quiz/scoring linkage.')
            for question in quiz.questions:
                options = [o.id for o in question.options]
                if len(set(options)) != len(options) or score.answerKey[question.id] not in options or not score.explanations[question.id]:
                    raise ValueError('Invalid scoring key.')
        return self


def load_catalog() -> Catalog:
    return Catalog.model_validate_json((FilePath(__file__).resolve().parents[1] / 'data/curriculum/kiran-v1.json').read_text())


def definition_hash(catalog: Catalog, quiz: Quiz) -> str:
    data = {'quiz': quiz.model_dump(mode='json'), 'scoring': catalog.scoring[quiz.id].model_dump(mode='json')}
    return sha256(json.dumps(data, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


class LessonList(StrictModel):
    items: list[LessonSummary]


class Answer(StrictModel):
    question_id: ContentID
    option_id: ContentID


class AttemptRequest(StrictModel):
    quiz_version: ContentVersion
    answers: list[Answer] = Field(min_length=1, max_length=100)


class Feedback(StrictModel):
    question_id: ContentID
    correct: bool
    explanation: str


class AttemptResponse(StrictModel):
    attempt_id: str
    correct: int
    total: int
    score_pct: Money
    passed: bool
    feedback: list[Feedback]


class ProgressItem(StrictModel):
    lesson_id: ContentID
    quiz_version: ContentVersion
    attempt_count: int
    best_score_pct: Money
    latest_score_pct: Money
    completed: bool


class ProgressResponse(StrictModel):
    items: list[ProgressItem]


router = APIRouter(prefix='/api/v1', tags=['learning'], responses={
    401: {'model': ErrorResponse}, 404: {'model': ErrorResponse}, 409: {'model': ErrorResponse},
    422: {'model': ErrorResponse}, 503: {'model': ErrorResponse}, 500: {'model': ErrorResponse}})


def find_quiz(request: Request, quiz_id: str) -> Quiz:
    quiz = request.app.state.catalog.quizzes.get(quiz_id)
    if quiz is None:
        raise APIError(404, 'quiz_not_found', 'Quiz not found.')
    return quiz


@router.get('/lessons', response_model=LessonList)
def lessons(request: Request, user: CurrentUser, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return LessonList(items=[LessonSummary.model_validate(l.model_dump(include={'id','version','title','topic'}))
        for _, l in sorted(request.app.state.catalog.lessons.items())])


@router.get('/lessons/{lesson_id}', response_model=Lesson)
def lesson(lesson_id: ContentPath, request: Request, user: CurrentUser, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    result = request.app.state.catalog.lessons.get(lesson_id)
    if result is None:
        raise APIError(404, 'lesson_not_found', 'Lesson not found.')
    return result


@router.get('/quizzes/{quiz_id}', response_model=Quiz)
def quiz(quiz_id: ContentPath, request: Request, user: CurrentUser, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return find_quiz(request, quiz_id)


@router.post('/quizzes/{quiz_id}/attempts', response_model=AttemptResponse)
def attempt(quiz_id: ContentPath, body: AttemptRequest, request: Request, user: CurrentUser, key: IdempotencyKey):
    fingerprint = request_fingerprint(body)
    with simulation_write(request) as session:
        cached = replay(session, user.id, 'quizzes.attempt', quiz_id, key, fingerprint)
        if cached is not None:
            return cached
        quiz = find_quiz(request, quiz_id)
        if quiz.version != body.quiz_version:
            raise APIError(409, 'stale_quiz_version', 'Quiz has been updated. Please refresh.')
        answers = {a.question_id: a.option_id for a in body.answers}
        ids = {q.id for q in quiz.questions}
        if len(answers) != len(body.answers) or set(answers) != ids or any(
            answers[q.id] not in {o.id for o in q.options} for q in quiz.questions):
            raise APIError(422, 'invalid_attempt', 'Every quiz question must be answered exactly once.')
        catalog = request.app.state.catalog
        checksum = definition_hash(catalog, quiz)
        # A published quiz version cannot silently change its questions or keys.
        if session.scalar(select(QuizAttempt.id).where(QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.quiz_version == quiz.version, QuizAttempt.definition_sha256 != checksum).limit(1)):
            raise APIError(503, 'curriculum_unavailable', 'Quiz version changed without a version increment.')
        scoring = catalog.scoring[quiz.id]
        feedback = [Feedback(question_id=q.id, correct=answers[q.id] == scoring.answerKey[q.id],
            explanation=scoring.explanations[q.id]) for q in quiz.questions]
        correct, total = sum(f.correct for f in feedback), len(feedback)
        bp = round_cents(Decimal(correct) * 10000 / total)
        row = QuizAttempt(user_id=user.id, quiz_id=quiz.id, lesson_id=quiz.lesson_id, quiz_version=quiz.version,
            definition_sha256=checksum, correct=correct, total=total, score_bp=bp)
        session.add(row)
        session.flush()
        result = AttemptResponse(attempt_id=row.id, correct=correct, total=total,
            score_pct=money_string(bp), passed=correct*100 >= total*80, feedback=feedback)
        return save_receipt(session, user.id, 'quizzes.attempt', quiz_id, key, fingerprint, result, 200)


@router.get('/progress', response_model=ProgressResponse)
def progress(request: Request, user: CurrentUser, session: DatabaseSession, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    items = []
    rows = list(session.scalars(select(QuizAttempt).where(QuizAttempt.user_id == user.id).order_by(QuizAttempt.sequence)))
    for lesson_id, lesson in sorted(request.app.state.catalog.lessons.items()):
        quiz = request.app.state.catalog.quizzes[lesson.quiz_id]
        relevant = [a for a in rows if a.quiz_id == quiz.id and a.quiz_version == quiz.version]
        checksum = definition_hash(request.app.state.catalog, quiz)
        if any(a.definition_sha256 != checksum for a in relevant):
            raise APIError(503, 'curriculum_unavailable', 'Quiz version changed without a version increment.')
        items.append(ProgressItem(lesson_id=lesson_id, quiz_version=quiz.version, attempt_count=len(relevant),
            best_score_pct=money_string(max((a.score_bp for a in relevant), default=0)),
            latest_score_pct=money_string(relevant[-1].score_bp if relevant else 0),
            completed=any(a.correct*100 >= a.total*80 for a in relevant)))
    return ProgressResponse(items=items)

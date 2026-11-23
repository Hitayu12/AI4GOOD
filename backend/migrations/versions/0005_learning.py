"""Private version-pinned quiz attempt persistence."""
from alembic import op

revision = "0005_learning"
down_revision = "0004_trading"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
    CREATE TABLE quiz_attempts (
        sequence INTEGER NOT NULL,
        id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        quiz_id VARCHAR(64) NOT NULL,
        lesson_id VARCHAR(64) NOT NULL,
        quiz_version INTEGER NOT NULL,
        definition_sha256 VARCHAR(64) NOT NULL,
        correct INTEGER NOT NULL,
        total INTEGER NOT NULL,
        score_bp INTEGER NOT NULL,
        PRIMARY KEY (sequence),
        CONSTRAINT ck_attempts_version CHECK (quiz_version BETWEEN 1 AND 1000000),
        CONSTRAINT ck_attempts_score CHECK (total BETWEEN 1 AND 100 AND correct BETWEEN 0 AND total),
        CONSTRAINT ck_attempts_percent CHECK (score_bp BETWEEN 0 AND 10000),
        CONSTRAINT ck_attempts_definition CHECK (length(definition_sha256) = 64),
        UNIQUE (id),
        FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)
    op.execute("""
    CREATE INDEX ix_quiz_attempts_user_id ON quiz_attempts (user_id)
    """)


def downgrade():
    op.drop_table("quiz_attempts")

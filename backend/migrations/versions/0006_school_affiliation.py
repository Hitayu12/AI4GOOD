"""Store an optional, self-reported institution on the account."""

from alembic import op
import sqlalchemy as sa

revision = "0006_school_affiliation"
down_revision = "0005_learning"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("school_name", sa.String(length=70), nullable=True))
    op.add_column("users", sa.Column("school_region", sa.String(length=4), nullable=True))


def downgrade():
    with op.batch_alter_table("users") as batch:
        batch.drop_column("school_region")
        batch.drop_column("school_name")

"""Queued orders, holdings, and immutable fill ledger."""
from alembic import op

revision = "0004_trading"
down_revision = "0003_simulations"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
    CREATE TABLE orders (
        id VARCHAR(36) NOT NULL,
        simulation_id VARCHAR(36) NOT NULL,
        symbol VARCHAR(12) NOT NULL,
        side VARCHAR(4) NOT NULL,
        quantity INTEGER NOT NULL,
        status VARCHAR(8) NOT NULL,
        submitted_at VARCHAR(20) NOT NULL,
        executed_at VARCHAR(20),
        execution_price_scaled BIGINT,
        rejection_code VARCHAR(40),
        PRIMARY KEY (id),
        CONSTRAINT ck_orders_side CHECK (side IN ('buy', 'sell')),
        CONSTRAINT ck_orders_quantity CHECK (typeof(quantity) = 'integer' AND quantity BETWEEN 1 AND 1000000),
        CONSTRAINT ck_orders_status CHECK (status IN ('pending', 'filled', 'rejected')),
        CONSTRAINT ck_orders_result CHECK ((status = 'filled' AND executed_at IS NOT NULL AND execution_price_scaled IS NOT NULL AND rejection_code IS NULL) OR (status = 'pending' AND executed_at IS NULL AND execution_price_scaled IS NULL AND rejection_code IS NULL) OR (status = 'rejected' AND executed_at IS NULL AND execution_price_scaled IS NULL AND rejection_code IS NOT NULL)),
        FOREIGN KEY(simulation_id) REFERENCES simulations (id) ON DELETE CASCADE
    )
    """)
    op.execute("""
    CREATE INDEX ix_orders_simulation_id ON orders (simulation_id)
    """)
    op.execute("""
    CREATE UNIQUE INDEX uq_orders_pending ON orders (simulation_id) WHERE status = 'pending'
    """)
    op.execute("""
    CREATE TABLE positions (
        simulation_id VARCHAR(36) NOT NULL,
        symbol VARCHAR(12) NOT NULL,
        quantity BIGINT NOT NULL,
        cost_basis_cents BIGINT NOT NULL,
        PRIMARY KEY (simulation_id, symbol),
        CONSTRAINT ck_positions_quantity CHECK (typeof(quantity) = 'integer' AND quantity >= 0),
        CONSTRAINT ck_positions_cost CHECK (typeof(cost_basis_cents) = 'integer' AND cost_basis_cents >= 0 AND (quantity > 0 OR cost_basis_cents = 0)),
        FOREIGN KEY(simulation_id) REFERENCES simulations (id) ON DELETE CASCADE
    )
    """)
    op.execute("""
    CREATE TABLE transactions (
        id VARCHAR(36) NOT NULL,
        simulation_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36) NOT NULL,
        symbol VARCHAR(12) NOT NULL,
        side VARCHAR(4) NOT NULL,
        quantity INTEGER NOT NULL,
        price_scaled BIGINT NOT NULL,
        gross_cents BIGINT NOT NULL,
        allocated_cost_cents BIGINT NOT NULL,
        session_date VARCHAR(10) NOT NULL,
        executed_at VARCHAR(20) NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT ck_transactions_side CHECK (side IN ('buy', 'sell')),
        CONSTRAINT ck_transactions_quantity CHECK (typeof(quantity) = 'integer' AND quantity BETWEEN 1 AND 1000000),
        CONSTRAINT ck_transactions_price CHECK (typeof(price_scaled) = 'integer' AND price_scaled BETWEEN 10000 AND 1000000000000),
        CONSTRAINT ck_transactions_gross CHECK (typeof(gross_cents) = 'integer' AND gross_cents > 0),
        CONSTRAINT ck_transactions_cost CHECK (typeof(allocated_cost_cents) = 'integer' AND allocated_cost_cents >= 0),
        FOREIGN KEY(simulation_id) REFERENCES simulations (id) ON DELETE CASCADE,
        UNIQUE (order_id),
        FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE
    )
    """)
    op.execute("""
    CREATE INDEX ix_transactions_simulation_id ON transactions (simulation_id)
    """)


def downgrade():
    op.drop_table("transactions")
    op.drop_table("positions")
    op.drop_table("orders")

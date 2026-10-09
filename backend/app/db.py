import os
from pathlib import Path

from sqlalchemy import create_engine, event, inspect
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# On Railway DATA_DIR points at the mounted volume so the DB and uploads survive redeploys.
DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parent.parent / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

engine = create_engine(f"sqlite:///{DATA_DIR / 'airbnb.db'}", connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _sqlite_pragmas(conn, _):
    # SQLite ignores foreign keys (and cascades) unless asked.
    conn.execute("PRAGMA foreign_keys=ON")


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def sync_schema():
    """Create missing tables, then add missing columns to existing ones (the live DB predates some columns)."""
    # ponytail: additive-only migration (new nullable/defaulted columns); switch to Alembic for renames or drops.
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        insp = inspect(conn)
        for table in Base.metadata.sorted_tables:
            existing = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name not in existing:
                    default = f" DEFAULT {col.server_default.arg}" if col.server_default is not None else ""
                    conn.exec_driver_sql(f"ALTER TABLE {table.name} ADD COLUMN {col.name} {col.type.compile(engine.dialect)}{default}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

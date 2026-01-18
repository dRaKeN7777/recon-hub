import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///../db/reconhub.db"
)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def wait_for_db(max_retries=10, delay=2):
    if DATABASE_URL.startswith("sqlite"):
        return
    for i in range(max_retries):
        try:
            with engine.connect():
                print("✅ Database is ready")
                return
        except OperationalError:
            print(f"⏳ Waiting for database... ({i+1}/{max_retries})")
            time.sleep(delay)
    raise RuntimeError("❌ Database not available after retries")

Base = declarative_base()



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

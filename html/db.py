from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://username:password@host:port/dbname"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

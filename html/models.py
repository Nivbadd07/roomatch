from sqlalchemy import Column, Integer, String, Boolean, Float, Date, ARRAY
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Apartment(Base):
    __tablename__ = 'apartments'
    id = Column(Integer, primary_key=True)
    city = Column(String)
    area = Column(String)
    contract_type = Column(String)
    price_per_month = Column(Integer)
    num_rooms = Column(Integer)
    features = Column(ARRAY(String))
    date_of_entry = Column(Date)

class UserApartmentPref(Base):
    __tablename__ = 'user_apartment_search_preferences'
    user_id = Column(Integer, primary_key=True)
    preferred_city = Column(String)
    preferred_area = Column(String)
    preferred_contract_type = Column(String)
    preferred_features = Column(ARRAY(String))
    preferred_num_rooms = Column(ARRAY(Float))
    preferred_price_min = Column(Integer)
    preferred_price_max = Column(Integer)
    preferred_date_of_entry = Column(Date)

class UserPreference(Base):
    __tablename__ = 'user_preferences'
    user_id = Column(Integer, primary_key=True)
    works_from_home = Column(Boolean)
    shares_cleaning = Column(Boolean)
    has_or_wants_pet = Column(Boolean)
    smokes = Column(Boolean)
    ok_with_smoker = Column(Boolean)
    cleanliness_importance = Column(Integer)
    cleaning_frequency = Column(String)
    guest_frequency = Column(String)
    noise_sensitivity = Column(String)

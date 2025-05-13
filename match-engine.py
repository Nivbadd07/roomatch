from flask import Flask, jsonify, request
from db import SessionLocal
from models import Apartment, UserApartmentPref, UserPreference, User
from sqlalchemy import and_, or_
import math

app = Flask(__name__)

# Weights for apartment matching criteria
APARTMENT_WEIGHTS = {
    'city': 20,              # Location is very important
    'area': 15,              # Specific area is important
    'contract_type': 10,     # Contract type is somewhat important
    'price': 20,             # Price range is very important
    'date': 10,              # Entry date is somewhat important
    'rooms': 15,             # Number of rooms is important
    'features': 10           # Features are somewhat important
}

# Weights for user matching criteria
USER_WEIGHTS = {
    'works_from_home': 15,    # Work style is important
    'shares_cleaning': 15,    # Cleaning responsibility is important
    'pet': 10,               # Pet compatibility is somewhat important
    'smoking': 15,           # Smoking compatibility is important
    'cleanliness': 15,       # Cleanliness is important
    'cleaning_frequency': 10, # Cleaning frequency is somewhat important
    'guest_frequency': 10,   # Guest frequency is somewhat important
    'noise': 10              # Noise sensitivity is somewhat important
}

def calculate_apartment_match_score(user_prefs, apartment):
    """Calculate match score between user preferences and apartment"""
    score = 0
    total_weight = sum(APARTMENT_WEIGHTS.values())
    
    # City match
    if apartment.city == user_prefs.preferred_city:
        score += APARTMENT_WEIGHTS['city']
        
    # Area match
    if apartment.area == user_prefs.preferred_area:
        score += APARTMENT_WEIGHTS['area']
        
    # Contract type match
    if apartment.contract_type == user_prefs.preferred_contract_type:
        score += APARTMENT_WEIGHTS['contract_type']
        
    # Price range match
    if (user_prefs.preferred_price_min <= apartment.price_per_month <= 
        user_prefs.preferred_price_max):
        score += APARTMENT_WEIGHTS['price']
        
    # Date of entry match
    if apartment.date_of_entry <= user_prefs.preferred_date_of_entry:
        score += APARTMENT_WEIGHTS['date']
        
    # Number of rooms match
    if apartment.num_rooms in user_prefs.preferred_num_rooms:
        score += APARTMENT_WEIGHTS['rooms']
        
    # Features match
    matching_features = set(user_prefs.preferred_features).intersection(
        set(apartment.features)
    )
    if matching_features:
        feature_score = (len(matching_features) / 
                        len(user_prefs.preferred_features)) * APARTMENT_WEIGHTS['features']
        score += feature_score
        
    return round((score / total_weight) * 100)

def calculate_roommate_match_score(apartment, owner_prefs, roommate, roommate_prefs):
    """Calculate match score between apartment and potential roommate"""
    score = 0
    total_weight = sum(USER_WEIGHTS.values())
    
    # Check if roommate's preferences match the apartment
    apt_match_score = calculate_apartment_match_score(roommate_prefs, apartment)
    if apt_match_score < 50:  # Minimum threshold for apartment match
        return 0
        
    # Compare user preferences
    if owner_prefs and roommate.user_preferences:
        # Work style compatibility
        if owner_prefs.works_from_home == roommate.user_preferences.works_from_home:
            score += USER_WEIGHTS['works_from_home']
            
        # Cleaning compatibility
        if owner_prefs.shares_cleaning == roommate.user_preferences.shares_cleaning:
            score += USER_WEIGHTS['shares_cleaning']
            
        # Pet compatibility
        if owner_prefs.pet == roommate.user_preferences.pet:
            score += USER_WEIGHTS['pet']
            
        # Smoking compatibility
        if owner_prefs.smoking == roommate.user_preferences.smoking:
            score += USER_WEIGHTS['smoking']
            
        # Cleanliness level
        cleanliness_diff = abs(owner_prefs.cleanliness - roommate.user_preferences.cleanliness)
        if cleanliness_diff <= 1:  # Allow small difference
            score += USER_WEIGHTS['cleanliness']
            
        # Cleaning frequency
        if owner_prefs.cleaning_frequency == roommate.user_preferences.cleaning_frequency:
            score += USER_WEIGHTS['cleaning_frequency']
            
        # Guest frequency
        if owner_prefs.guest_frequency == roommate.user_preferences.guest_frequency:
            score += USER_WEIGHTS['guest_frequency']
            
        # Noise sensitivity
        if owner_prefs.noise == roommate.user_preferences.noise:
            score += USER_WEIGHTS['noise']
            
    return round((score / total_weight) * 100)

@app.route('/api/match/apartments/<int:user_id>')
def get_apartment_matches(user_id):
    """Get apartment matches for a user looking for an apartment"""
    db = SessionLocal()
    try:
        # Get user's apartment preferences
        user_prefs = db.query(UserApartmentPref).filter(
            UserApartmentPref.user_id == user_id
        ).first()
        
        if not user_prefs:
            return jsonify({"results": []})
            
        # Find matching apartments
        matching_apts = db.query(Apartment).filter(
            and_(
                Apartment.city == user_prefs.preferred_city,
                Apartment.price_per_month >= user_prefs.preferred_price_min,
                Apartment.price_per_month <= user_prefs.preferred_price_max,
                Apartment.date_of_entry <= user_prefs.preferred_date_of_entry
            )
        ).all()
        
        # Calculate match scores
        scored_matches = []
        for apt in matching_apts:
            score = calculate_apartment_match_score(user_prefs, apt)
            if score > 0:  # Only include matches with positive scores
                scored_matches.append({
                    "apartment": {
                        "id": apt.id,
                        "address": apt.address,
                        "city": apt.city,
                        "area": apt.area,
                        "contract_type": apt.contract_type,
                        "features": apt.features,
                        "num_rooms": apt.num_rooms,
                        "price_per_month": apt.price_per_month,
                        "description": apt.description,
                        "date_of_entry": apt.date_of_entry.isoformat() if apt.date_of_entry else None,
                        "image_urls": apt.image_urls,
                        "roommate_id": apt.roommate_id
                    },
                    "match_score": score
                })
                
        # Sort by match score
        scored_matches.sort(key=lambda x: x["match_score"], reverse=True)
        return jsonify({"results": scored_matches})
        
    finally:
        db.close()

@app.route('/api/match/roommates/<int:user_id>')
def get_roommate_matches(user_id):
    """Get roommate matches for an apartment owner"""
    db = SessionLocal()
    try:
        # Get user's apartment
        user_apt = db.query(Apartment).filter(
            Apartment.roommate_id.contains([user_id])
        ).first()
        
        if not user_apt:
            return jsonify({"results": []})
            
        # Get user's preferences
        user_prefs = db.query(UserPreference).filter(
            UserPreference.user_id == user_id
        ).first()
        
        # Find potential roommates (users looking for apartments)
        potential_roommates = db.query(User).filter(
            and_(
                User.user_type == "Looking for Apt",
                User.id != user_id
            )
        ).all()
        
        # Calculate match scores
        scored_matches = []
        for roommate in potential_roommates:
            roommate_prefs = db.query(UserApartmentPref).filter(
                UserApartmentPref.user_id == roommate.id
            ).first()
            
            if roommate_prefs:
                score = calculate_roommate_match_score(
                    user_apt, 
                    user_prefs,
                    roommate,
                    roommate_prefs
                )
                if score > 0:
                    scored_matches.append({
                        "roommate": {
                            "id": roommate.id,
                            "name": roommate.name,
                            "email": roommate.email,
                            "age": roommate.age,
                            "interests": roommate.interests,
                            "photo": roommate.photo,
                            "user_type": roommate.user_type
                        },
                        "match_score": score
                    })
                    
        # Sort by match score
        scored_matches.sort(key=lambda x: x["match_score"], reverse=True)
        return jsonify({"results": scored_matches})
        
    finally:
        db.close()

if __name__ == '__main__':
    app.run(debug=True) 
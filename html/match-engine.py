from flask import Flask, jsonify, request
from db import SessionLocal
from models import Apartment, UserApartmentPref, UserPreference
from sqlalchemy import desc
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

# התאמה בין משתמש לדירה
def match_user_to_apartment(user_pref, apt):
    score = 0
    total_weight = sum(APARTMENT_WEIGHTS.values())
    
    # City match
    if apt.city == user_pref.preferred_city:
        score += APARTMENT_WEIGHTS['city']
    
    # Area match
    if apt.area == user_pref.preferred_area:
        score += APARTMENT_WEIGHTS['area']
    
    # Contract type match
    if apt.contract_type == user_pref.preferred_contract_type:
        score += APARTMENT_WEIGHTS['contract_type']
    
    # Price range match
    if user_pref.preferred_price_min <= apt.price_per_month <= user_pref.preferred_price_max:
        score += APARTMENT_WEIGHTS['price']
    
    # Date of entry match
    if apt.date_of_entry <= user_pref.preferred_date_of_entry:
        score += APARTMENT_WEIGHTS['date']
    
    # Number of rooms match
    if int(apt.num_rooms) in [int(x) for x in user_pref.preferred_num_rooms]:
        score += APARTMENT_WEIGHTS['rooms']
    
    # Features match
    matching_features = set(user_pref.preferred_features).intersection(set(apt.features))
    if matching_features:
        feature_score = (len(matching_features) / len(user_pref.preferred_features)) * APARTMENT_WEIGHTS['features']
        score += feature_score
    
    return round((score / total_weight) * 100)

# התאמה בין משתמש למשתמש
def match_users(p1, p2):
    score = 0
    total_weight = sum(USER_WEIGHTS.values())
    
    # Work from home compatibility
    if p1.works_from_home == p2.works_from_home:
        score += USER_WEIGHTS['works_from_home']
    
    # Cleaning responsibility compatibility
    if p1.shares_cleaning == p2.shares_cleaning:
        score += USER_WEIGHTS['shares_cleaning']
    
    # Pet compatibility
    if p1.has_or_wants_pet == p2.has_or_wants_pet:
        score += USER_WEIGHTS['pet']
    
    # Smoking compatibility
    if p1.smokes == p2.ok_with_smoker or p2.smokes == p1.ok_with_smoker:
        score += USER_WEIGHTS['smoking']
    
    # Cleanliness importance compatibility
    cleanliness_diff = abs(p1.cleanliness_importance - p2.cleanliness_importance)
    if cleanliness_diff <= 1:
        score += USER_WEIGHTS['cleanliness']
    elif cleanliness_diff <= 2:
        score += USER_WEIGHTS['cleanliness'] * 0.5
    
    # Cleaning frequency compatibility
    if p1.cleaning_frequency == p2.cleaning_frequency:
        score += USER_WEIGHTS['cleaning_frequency']
    
    # Guest frequency compatibility
    if p1.guest_frequency == p2.guest_frequency:
        score += USER_WEIGHTS['guest_frequency']
    
    # Noise sensitivity compatibility
    if p1.noise_sensitivity == p2.noise_sensitivity:
        score += USER_WEIGHTS['noise']
    
    return round((score / total_weight) * 100)

# API להתאמת דירות
@app.route("/api/match/apartments/<int:user_id>")
def match_apartments(user_id):
    # Get query parameters
    min_score = int(request.args.get('min_score', 0))
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    
    db = SessionLocal()
    user_pref = db.query(UserApartmentPref).filter_by(user_id=user_id).first()
    
    if not user_pref:
        db.close()
        return jsonify({"error": "User preferences not found"}), 404
    
    # Get all apartments
    apartments = db.query(Apartment).all()
    
    # Calculate match scores
    results = [
        {
            "apartment_id": apt.id,
            "match_score": match_user_to_apartment(user_pref, apt),
            "details": {
                "city": apt.city,
                "area": apt.area,
                "price": apt.price_per_month,
                "rooms": apt.num_rooms,
                "features": apt.features,
                "date_of_entry": apt.date_of_entry.isoformat() if apt.date_of_entry else None
            }
        }
        for apt in apartments
    ]
    
    # Filter by minimum score
    results = [r for r in results if r["match_score"] >= min_score]
    
    # Sort by match score
    results.sort(key=lambda x: x["match_score"], reverse=True)
    
    # Calculate pagination
    total_results = len(results)
    total_pages = math.ceil(total_results / per_page)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    
    # Get paginated results
    paginated_results = results[start_idx:end_idx]
    
    db.close()
    
    return jsonify({
        "results": paginated_results,
        "pagination": {
            "current_page": page,
            "total_pages": total_pages,
            "total_results": total_results,
            "per_page": per_page
        }
    })

# API להתאמת שותפים
@app.route("/api/match/users/<int:user_id>")
def match_users_route(user_id):
    # Get query parameters
    min_score = int(request.args.get('min_score', 0))
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    
    db = SessionLocal()
    current = db.query(UserPreference).filter_by(user_id=user_id).first()
    
    if not current:
        db.close()
        return jsonify({"error": "User preferences not found"}), 404
    
    others = db.query(UserPreference).filter(UserPreference.user_id != user_id).all()
    
    # Calculate match scores
    results = [
        {
            "user_id": other.user_id,
            "match_score": match_users(current, other),
            "details": {
                "works_from_home": other.works_from_home,
                "shares_cleaning": other.shares_cleaning,
                "has_or_wants_pet": other.has_or_wants_pet,
                "cleanliness_importance": other.cleanliness_importance,
                "cleaning_frequency": other.cleaning_frequency,
                "guest_frequency": other.guest_frequency,
                "noise_sensitivity": other.noise_sensitivity
            }
        }
        for other in others
    ]
    
    # Filter by minimum score
    results = [r for r in results if r["match_score"] >= min_score]
    
    # Sort by match score
    results.sort(key=lambda x: x["match_score"], reverse=True)
    
    # Calculate pagination
    total_results = len(results)
    total_pages = math.ceil(total_results / per_page)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    
    # Get paginated results
    paginated_results = results[start_idx:end_idx]
    
    db.close()
    
    return jsonify({
        "results": paginated_results,
        "pagination": {
            "current_page": page,
            "total_pages": total_pages,
            "total_results": total_results,
            "per_page": per_page
        }
    })

if __name__ == "__main__":
    app.run(debug=True)

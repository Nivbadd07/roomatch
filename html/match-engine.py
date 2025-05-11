from flask import Flask, jsonify
from db import SessionLocal
from models import Apartment, UserApartmentPref, UserPreference

app = Flask(__name__)

# התאמה בין משתמש לדירה
def match_user_to_apartment(user_pref, apt):
    score, total = 0, 0
    if apt.city == user_pref.preferred_city: score += 1
    total += 1
    if apt.area == user_pref.preferred_area: score += 1
    total += 1
    if apt.contract_type == user_pref.preferred_contract_type: score += 1
    total += 1
    if user_pref.preferred_price_min <= apt.price_per_month <= user_pref.preferred_price_max: score += 1
    total += 1
    if apt.date_of_entry <= user_pref.preferred_date_of_entry: score += 1
    total += 1
    if int(apt.num_rooms) in [int(x) for x in user_pref.preferred_num_rooms]: score += 1
    total += 1
    if set(user_pref.preferred_features).issubset(set(apt.features)): score += 1
    total += 1
    return round((score / total) * 100)

# התאמה בין משתמש למשתמש
def match_users(p1, p2):
    score, total = 0, 0
    if p1.works_from_home == p2.works_from_home: score += 1
    total += 1
    if p1.shares_cleaning == p2.shares_cleaning: score += 1
    total += 1
    if p1.has_or_wants_pet == p2.has_or_wants_pet: score += 1
    total += 1
    if p1.smokes == p2.ok_with_smoker or p2.smokes == p1.ok_with_smoker: score += 1
    total += 1
    if abs(p1.cleanliness_importance - p2.cleanliness_importance) <= 2: score += 1
    total += 1
    if p1.cleaning_frequency == p2.cleaning_frequency: score += 1
    total += 1
    if p1.guest_frequency == p2.guest_frequency: score += 1
    total += 1
    if p1.noise_sensitivity == p2.noise_sensitivity: score += 1
    total += 1
    return round((score / total) * 100)

# API להתאמת דירות
@app.route("/api/match/apartments/<int:user_id>")
def match_apartments(user_id):
    db = SessionLocal()
    user_pref = db.query(UserApartmentPref).filter_by(user_id=user_id).first()
    apartments = db.query(Apartment).all()
    
    # חישוב אחוזי ההתאמה לכל דירה
    results = [
        {"apartment_id": apt.id, "match_score": match_user_to_apartment(user_pref, apt)}
        for apt in apartments
    ]
    
    db.close()
    return jsonify(results)

# API להתאמת שותפים
@app.route("/api/match/users/<int:user_id>")
def match_users_route(user_id):
    db = SessionLocal()
    current = db.query(UserPreference).filter_by(user_id=user_id).first()
    others = db.query(UserPreference).filter(UserPreference.user_id != user_id).all()
    
    # חישוב אחוזי ההתאמה לכל שותף
    results = [
        {"user_id": other.user_id, "match_score": match_users(current, other)}
        for other in others
    ]
    
    db.close()
    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True)

from flask import Flask, jsonify, request
from db import SessionLocal
from models import Apartment, UserApartmentPref, UserPreference, User
from match_service import MatchService
from sqlalchemy import desc
import math

app = Flask(__name__)

# ... existing code ...

@app.route('/api/match/apartments/<int:user_id>')
def get_apartment_matches(user_id):
    """Get apartment matches for a user looking for an apartment"""
    db = SessionLocal()
    try:
        match_service = MatchService(db)
        matches = match_service.find_matches(user_id)
        return jsonify({
            "results": [
                {
                    "apartment": {
                        "id": match["apartment"].id,
                        "address": match["apartment"].address,
                        "city": match["apartment"].city,
                        "area": match["apartment"].area,
                        "contract_type": match["apartment"].contract_type,
                        "features": match["apartment"].features,
                        "num_rooms": match["apartment"].num_rooms,
                        "price_per_month": match["apartment"].price_per_month,
                        "description": match["apartment"].description,
                        "date_of_entry": match["apartment"].date_of_entry.isoformat() if match["apartment"].date_of_entry else None,
                        "image_urls": match["apartment"].image_urls,
                        "roommate_id": match["apartment"].roommate_id
                    },
                    "match_score": match["match_score"]
                }
                for match in matches
            ]
        })
    finally:
        db.close()

@app.route('/api/match/roommates/<int:user_id>')
def get_roommate_matches(user_id):
    """Get roommate matches for an apartment owner"""
    db = SessionLocal()
    try:
        match_service = MatchService(db)
        matches = match_service.find_matches(user_id)
        return jsonify({
            "results": [
                {
                    "roommate": {
                        "id": match["roommate"].id,
                        "name": match["roommate"].name,
                        "email": match["roommate"].email,
                        "age": match["roommate"].age,
                        "interests": match["roommate"].interests,
                        "photo": match["roommate"].photo,
                        "user_type": match["roommate"].user_type
                    },
                    "match_score": match["match_score"]
                }
                for match in matches
            ]
        })
    finally:
        db.close()

# ... rest of your existing code ... 
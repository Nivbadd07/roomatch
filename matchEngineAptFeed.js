import { Apartment, User, UserApartmentPref, UserPreference, sequelize } from './models.js';

// Weights (adjust as needed)
const APARTMENT_WEIGHTS = {
  preferred_city: 20,
  preferred_area: 10,
  preferred_contract_type: 10,
  preferred_features: 10,
  preferred_num_rooms: 10,
  preferred_price: 10,
  preferred_date_of_entry: 10
};
const ROOMMATE_WEIGHTS = {
  works_from_home: 5,
  shares_cleaning: 5,
  has_or_wants_pet: 5,
  smokes: 5,
  ok_with_smoker: 5,
  cleanliness_importance: 5,
  cleaning_frequency: 5,
  guest_frequency: 5,
  noise_sensitivity: 5
};

export async function calculateApartmentFeedMatches(userId) {
  try {
    // 1. Fetch user preferences
    const userPref = await UserPreference.findOne({ where: { user_id: userId } });
    const userAptPref = await UserApartmentPref.findOne({ where: { user_id: userId } });
    // 2. Fetch all apartments not occupied by this user
    const apartments = await Apartment.findAll();
    const results = [];

    if (!userPref || !userAptPref) {
      // Fallback: return 4 random apartments
      const randomApts = await Apartment.findAll({ order: sequelize.random(), limit: 4 });
      return randomApts.map(apt => ({ apartment: apt, score: 0 }));
    }

    for (const apt of apartments) {
      // 3. Apartment match score
      let aptScore = 0;
      let aptMax = 0;
      // preferred_city
      aptMax += APARTMENT_WEIGHTS.preferred_city;
      if (userAptPref.preferred_city && apt.city && userAptPref.preferred_city === apt.city) aptScore += APARTMENT_WEIGHTS.preferred_city;
      // preferred_area
      aptMax += APARTMENT_WEIGHTS.preferred_area;
      if (userAptPref.preferred_area && apt.area && userAptPref.preferred_area === apt.area) aptScore += APARTMENT_WEIGHTS.preferred_area;
      // preferred_contract_type
      aptMax += APARTMENT_WEIGHTS.preferred_contract_type;
      if (userAptPref.preferred_contract_type && apt.contract_type && userAptPref.preferred_contract_type === apt.contract_type) aptScore += APARTMENT_WEIGHTS.preferred_contract_type;
      // preferred_features (array overlap)
      aptMax += APARTMENT_WEIGHTS.preferred_features;
      if (Array.isArray(userAptPref.preferred_features) && Array.isArray(apt.features) && userAptPref.preferred_features.length > 0) {
        const overlap = apt.features.filter(f => userAptPref.preferred_features.includes(f));
        aptScore += (overlap.length / userAptPref.preferred_features.length) * APARTMENT_WEIGHTS.preferred_features;
      }
      // preferred_num_rooms
      aptMax += APARTMENT_WEIGHTS.preferred_num_rooms;
      if (Array.isArray(userAptPref.preferred_num_rooms) && userAptPref.preferred_num_rooms.includes(apt.num_rooms)) aptScore += APARTMENT_WEIGHTS.preferred_num_rooms;
      // preferred_price
      aptMax += APARTMENT_WEIGHTS.preferred_price;
      if (
        typeof userAptPref.preferred_price_min === 'number' &&
        typeof userAptPref.preferred_price_max === 'number' &&
        typeof apt.price_per_month === 'number' &&
        apt.price_per_month >= userAptPref.preferred_price_min &&
        apt.price_per_month <= userAptPref.preferred_price_max
      ) aptScore += APARTMENT_WEIGHTS.preferred_price;
      // preferred_date_of_entry
      aptMax += APARTMENT_WEIGHTS.preferred_date_of_entry;
      if (userAptPref.preferred_date_of_entry && apt.date_of_entry && new Date(apt.date_of_entry) <= new Date(userAptPref.preferred_date_of_entry)) aptScore += APARTMENT_WEIGHTS.preferred_date_of_entry;
      const apartmentMatch = aptMax > 0 ? (aptScore / aptMax) : 0;

      // 4. Roommate match score (compare userPref to preferences of first roommate in apartment)
      let roommateMatch = 0;
      let roommateMax = 0;
      let roommatePrefs = null;
      if (Array.isArray(apt.roommate_id) && apt.roommate_id.length > 0) {
        roommatePrefs = await UserPreference.findOne({ where: { user_id: apt.roommate_id[0] } });
      }
      if (roommatePrefs) {
        for (const key of Object.keys(ROOMMATE_WEIGHTS)) {
          roommateMax += ROOMMATE_WEIGHTS[key];
          if (key === 'cleanliness_importance') {
            if (
              typeof userPref.cleanliness_importance === 'number' &&
              typeof roommatePrefs.cleanliness_importance === 'number' &&
              Math.abs(userPref.cleanliness_importance - roommatePrefs.cleanliness_importance) <= 1
            ) roommateMatch += ROOMMATE_WEIGHTS[key];
          } else if (userPref[key] && roommatePrefs[key] && userPref[key] === roommatePrefs[key]) {
            roommateMatch += ROOMMATE_WEIGHTS[key];
          }
        }
      }
      const roommateScore = roommateMax > 0 ? (roommateMatch / roommateMax) : 0;

      // 5. Combine scores (60% apartment, 40% roommate)
      const finalScore = Math.round((apartmentMatch * 0.6 + roommateScore * 0.4) * 100);
      results.push({ apartment: apt, score: finalScore });
    }

    // Sort by score descending, take top 4, fill with randoms if needed
    results.sort((a, b) => b.score - a.score);
    while (results.length < 4) {
      // Add random apartments (score 0) if not enough
      const unused = apartments.filter(apt => !results.some(r => r.apartment.id === apt.id));
      if (unused.length === 0) break;
      const rand = unused[Math.floor(Math.random() * unused.length)];
      results.push({ apartment: rand, score: 0 });
    }
    return results.slice(0, 4);
  } catch (err) {
    // Fallback: return 4 random apartments even on error
    try {
      const randomApts = await Apartment.findAll({ order: sequelize.random(), limit: 4 });
      return randomApts.map(apt => ({ apartment: apt, score: 0 }));
    } catch (fallbackErr) {
      return [];
    }
  }
}

export function calculateApartmentMatchScore() {}
export function calculateRoommateMatchScore() {} 
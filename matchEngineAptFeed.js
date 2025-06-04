import { Apartment, User, UserApartmentPref, UserPreference, sequelize, Op } from './models.js';

// Weights (adjusted to match roommate feed weights)
const APARTMENT_WEIGHTS = {
  preferred_city: 30,          // Higher weight for city
  preferred_area: 10,
  preferred_contract_type: 15, // Higher weight for contract type
  preferred_features: 25,      // Higher weight for features
  preferred_num_rooms: 5,
  preferred_price: 10,
  preferred_date_of_entry: 5
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

function numericDiffScore(a, b, maxDiff, weight) {
  const diff = Math.abs(a - b);
  if (diff <= maxDiff)       return weight;      // full credit
  if (diff === maxDiff + 1)  return weight * 0.5;// partial credit
  return 0;
}

function linearWindowScore(value, min, max, weight) {
  if (value < min || value > max) return 0;
  const mid   = (min + max) / 2;
  const range = (max - min) / 2;
  const decay = Math.abs(value - mid) / range;   // 0 at center, 1 at edges
  return weight * (1 - decay);
}

export async function calculateApartmentFeedMatches(userId) {
  try {
    // 1. Fetch user preferences
    const userPref = await UserPreference.findOne({ where: { user_id: userId } });
    const userAptPref = await UserApartmentPref.findOne({ where: { user_id: userId } });
    console.log("userPref:", userPref);
    console.log("userAptPref:", userAptPref);
    
    // 2. Fetch all apartments not occupied by this user
    const apartments = await Apartment.findAll({
      attributes: [
        'id', 'city', 'area', 'price_per_month', 'features', 'num_rooms', 'contract_type',
        'date_of_entry', 'address', 'roommate_id', 'image_urls', 'description'
      ]
    });
    console.log("Fetched apartments:", apartments.length);
    const results = [];

    if (!userPref || !userAptPref) {
      console.log("Missing user preferences, using fallback.");
      const randomApts = await Apartment.findAll({
        order: sequelize.random(),
        limit: 6,
        attributes: [
          'id', 'city', 'area', 'price_per_month', 'features', 'num_rooms', 'contract_type',
          'date_of_entry', 'address', 'roommate_id', 'image_urls', 'description'
        ]
      });
      console.log("Fallback random apartments:", randomApts.map(a => a.id));
      randomApts.forEach(apt => {
        if (typeof apt.image_urls === 'string') {
          try { apt.image_urls = JSON.parse(apt.image_urls); } catch { apt.image_urls = []; }
        }
        if (!Array.isArray(apt.image_urls)) apt.image_urls = [];
      });
      return randomApts.map(apt => ({ apartment: apt, match_score: 50 })); // Default middle score
    }

    for (const apt of apartments) {
      // Ensure image_urls is always an array
      if (typeof apt.image_urls === 'string') {
        try { apt.image_urls = JSON.parse(apt.image_urls); } catch { apt.image_urls = []; }
      }
      if (!Array.isArray(apt.image_urls)) apt.image_urls = [];
      
      console.log("Processing apartment:", apt.id, "roommate_id:", apt.roommate_id);
      
      // 3. Apartment match score
      let aptScore = 0;
      let aptMax = 0;

      // City match (high weight)
      aptMax += APARTMENT_WEIGHTS.preferred_city;
      if (userAptPref.preferred_city && apt.city && userAptPref.preferred_city === apt.city) {
        aptScore += APARTMENT_WEIGHTS.preferred_city;
      }

      // Area match
      aptMax += APARTMENT_WEIGHTS.preferred_area;
      if (userAptPref.preferred_area && apt.area && userAptPref.preferred_area === apt.area) {
        aptScore += APARTMENT_WEIGHTS.preferred_area;
      }

      // Contract type match (high weight)
      aptMax += APARTMENT_WEIGHTS.preferred_contract_type;
      if (userAptPref.preferred_contract_type && apt.contract_type && 
          userAptPref.preferred_contract_type === apt.contract_type) {
        aptScore += APARTMENT_WEIGHTS.preferred_contract_type;
      }

      // Features match (high weight)
      aptMax += APARTMENT_WEIGHTS.preferred_features;
      if (Array.isArray(userAptPref.preferred_features) && Array.isArray(apt.features) && 
          userAptPref.preferred_features.length > 0) {
        const overlap = apt.features.filter(f => userAptPref.preferred_features.includes(f));
        aptScore += (overlap.length / userAptPref.preferred_features.length) * APARTMENT_WEIGHTS.preferred_features;
      }

      // Number of rooms match
      aptMax += APARTMENT_WEIGHTS.preferred_num_rooms;
      if (Array.isArray(userAptPref.preferred_num_rooms) && 
          userAptPref.preferred_num_rooms.includes(apt.num_rooms)) {
        aptScore += APARTMENT_WEIGHTS.preferred_num_rooms;
      }

      // Price range match (using linear window)
      aptMax += APARTMENT_WEIGHTS.preferred_price;
      if (
        typeof userAptPref.preferred_price_min === 'number' &&
        typeof userAptPref.preferred_price_max === 'number' &&
        typeof apt.price_per_month === 'number'
      ) {
        aptScore += linearWindowScore(
          apt.price_per_month,
          userAptPref.preferred_price_min,
          userAptPref.preferred_price_max,
          APARTMENT_WEIGHTS.preferred_price
        );
      }

      // Date of entry match
      aptMax += APARTMENT_WEIGHTS.preferred_date_of_entry;
      if (userAptPref.preferred_date_of_entry && apt.date_of_entry) {
        const diffDays = (new Date(apt.date_of_entry) -
                        new Date(userAptPref.preferred_date_of_entry)) / 864e5;
        if (diffDays <= 0)        aptScore += APARTMENT_WEIGHTS.preferred_date_of_entry;
        else if (diffDays <= 30)  aptScore += APARTMENT_WEIGHTS.preferred_date_of_entry * 0.5;
      }

      const apartmentMatch = aptMax > 0 ? (aptScore / aptMax) : 0;

      // 4. Roommate match score (if apartment has roommates)
      let roommateMatch = 0;
      let roommateMax = 0;
      let roommatePrefs = null;
      
      if (Array.isArray(apt.roommate_id) && apt.roommate_id.length > 0) {
        roommatePrefs = await UserPreference.findOne({ where: { user_id: apt.roommate_id[0] } });
      }
      
      if (roommatePrefs) {
        // Cleanliness importance (numeric ± 1 full, ± 2 half)
        roommateMax += ROOMMATE_WEIGHTS.cleanliness_importance;
        roommateMatch += numericDiffScore(
          userPref.cleanliness_importance,
          roommatePrefs.cleanliness_importance,
          1,
          ROOMMATE_WEIGHTS.cleanliness_importance
        );

        // Boolean preferences
        const BOOLS = [
          'works_from_home',
          'shares_cleaning',
          'has_or_wants_pet',
          'smokes',
          'ok_with_smoker'
        ];
        
        for (const key of BOOLS) {
          roommateMax += ROOMMATE_WEIGHTS[key];
          if (userPref[key] === roommatePrefs[key]) {
            roommateMatch += ROOMMATE_WEIGHTS[key];
          }
        }
      }
      
      const roommateScore = roommateMax > 0 ? (roommateMatch / roommateMax) : 0;

      // 5. Combine scores (70% apartment, 30% roommate) and normalize to 40-100 range
      const raw = apartmentMatch * 0.7 + roommateScore * 0.3;  // 0-1
      const finalScore = Math.round(40 + 60 * raw);            // 40-100
      
      results.push({ apartment: apt, match_score: finalScore });
      console.log("Pushed apartment:", apt.id, "score:", finalScore);
    }

    // Sort by score descending, take top 6
    results.sort((a, b) => b.match_score - a.match_score);
    console.log("Results before fallback:", results.length);
    
    while (results.length < 6) {
      // Add random apartments with minimum score if not enough
      const unused = apartments.filter(apt => !results.some(r => r.apartment.id === apt.id));
      if (unused.length === 0) break;
      const rand = unused[Math.floor(Math.random() * unused.length)];
      results.push({ apartment: rand, match_score: 50 }); // Default middle score
      console.log("Added fallback apartment:", rand.id);
    }
    
    console.log("Final results:", results.slice(0, 9).map(r => ({ id: r.apartment.id, score: r.match_score })));
    return results.slice(0, 9);
  } catch (err) {
    console.log("Error in match engine:", err);
    // Fallback: return 6 random apartments even on error
    try {
      const randomApts = await Apartment.findAll({ order: sequelize.random(), limit: 9 });
      console.log("Catch fallback random apartments:", randomApts.map(a => a.id));
      return randomApts.map(apt => ({ apartment: apt, match_score: 50 })); // Default middle score
    } catch (fallbackErr) {
      console.log("Error in fallback:", fallbackErr);
      return [];
    }
  }
}

// Keep these empty functions as they are
export function calculateApartmentMatchScore() {}
export function calculateRoommateMatchScore() {} 
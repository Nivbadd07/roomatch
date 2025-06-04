import { Apartment, User, UserApartmentPref, UserPreference, sequelize, Op } from './models.js';

// Weights for roommate preferences matching
const ROOMMATE_WEIGHTS = {
  works_from_home: 10,
  shares_cleaning: 10,
  has_or_wants_pet: 10,
  smokes: 10,
  ok_with_smoker: 10,
  cleanliness_importance: 10,
  cleaning_frequency: 10,
  guest_frequency: 10,
  noise_sensitivity: 10
};

// Weights for apartment preferences matching
const APARTMENT_WEIGHTS = {
  preferred_city: 30,          // Higher weight for city
  preferred_area: 10,
  preferred_contract_type: 15, // Higher weight for contract type
  preferred_features: 25,      // Higher weight for features
  preferred_num_rooms: 5,
  preferred_price: 10,
  preferred_date_of_entry: 5
};

function boolMatch(a, b, weight, tolerateNeutral = false) {
  if (a === b) return weight;                           // perfect match
  if (tolerateNeutral && (a === null || b === null))    // one side "doesn't care"
    return weight * 0.5;
  return 0;
}

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

export async function calculateRoommateFeedMatches(userId) {
  try {
    // 1. Fetch the current user's preferences and apartment
    const userPref = await UserPreference.findOne({ where: { user_id: userId } });
    const userApt = await Apartment.findOne({ where: { roommate_id: { [Op.contains]: [userId] } } });
    
    console.log("User preferences:", userPref);
    console.log("User apartment:", userApt);

    // 2. Fetch all users looking for apartments
    const potentialRoommates = await User.findAll({
      where: { user_type: "Looking for Apt" },
      include: [
        { model: UserPreference, as: 'preferences' },
        { model: UserApartmentPref, as: 'apartmentPreferences' }
      ]
    });

    console.log("Found potential roommates:", potentialRoommates.length);
    const results = [];

    if (!userPref || !userApt) {
      console.log("Missing user preferences or apartment, using fallback.");
      // Fallback: return 4 random users looking for apartments
      const randomUsers = await User.findAll({
        where: { user_type: "Looking for Apt" },
        order: sequelize.random(),
        limit: 9
      });
      return randomUsers.map(user => ({
        roommate: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          profile_image_url: user.profile_image_url,
          age: user.age,
          gender: user.gender,
          interests: user.interests,
          bio: user.bio,
          preferences: user.preferences,
          apartmentPreferences: user.apartmentPreferences
        },
        match_score: 0
      }));
    }

    for (const potentialRoommate of potentialRoommates) {
      // Skip if this is the same user
      if (potentialRoommate.id === userId) continue;

      // 3. Roommate preferences match score
      let roommateScore = 0;
      let roommateMax = 0;
      const roommatePref = potentialRoommate.preferences;

      if (roommatePref) {
        // Cleanliness importance (numeric ± 1 full, ± 2 half)
        roommateMax   += ROOMMATE_WEIGHTS.cleanliness_importance;
        roommateScore += numericDiffScore(
          userPref.cleanliness_importance,
          roommatePref.cleanliness_importance,
          1,
          ROOMMATE_WEIGHTS.cleanliness_importance
        );

        // Boolean prefs with optional tolerance
        const BOOLS = [
          ['works_from_home', false],
          ['shares_cleaning', false],
          ['has_or_wants_pet', false],
          ['smokes', false],
          ['ok_with_smoker',  true]
        ];
        for (const [key, tolerate] of BOOLS) {
          roommateMax   += ROOMMATE_WEIGHTS[key];
          roommateScore += boolMatch(
            userPref[key],
            roommatePref[key],
            ROOMMATE_WEIGHTS[key],
            tolerate
          );
        }
      }
      const roommateMatch = roommateMax > 0 ? (roommateScore / roommateMax) : 0;

      // 4. Apartment preferences match score
      let aptScore = 0;
      let aptMax = 0;
      const aptPref = potentialRoommate.apartmentPreferences;

      if (aptPref && userApt) {
        // City match
        aptMax += APARTMENT_WEIGHTS.preferred_city;
        if (aptPref.preferred_city && userApt.city && aptPref.preferred_city === userApt.city) {
          aptScore += APARTMENT_WEIGHTS.preferred_city;
        }

        // Area match
        aptMax += APARTMENT_WEIGHTS.preferred_area;
        if (aptPref.preferred_area && userApt.area && aptPref.preferred_area === userApt.area) {
          aptScore += APARTMENT_WEIGHTS.preferred_area;
        }

        // Contract type match
        aptMax += APARTMENT_WEIGHTS.preferred_contract_type;
        if (aptPref.preferred_contract_type && userApt.contract_type && 
            aptPref.preferred_contract_type === userApt.contract_type) {
          aptScore += APARTMENT_WEIGHTS.preferred_contract_type;
        }

        // Features match
        aptMax += APARTMENT_WEIGHTS.preferred_features;
        if (Array.isArray(aptPref.preferred_features) && Array.isArray(userApt.features) && 
            aptPref.preferred_features.length > 0) {
          const overlap = userApt.features.filter(f => aptPref.preferred_features.includes(f));
          aptScore += (overlap.length / aptPref.preferred_features.length) * APARTMENT_WEIGHTS.preferred_features;
        }

        // Number of rooms match
        aptMax += APARTMENT_WEIGHTS.preferred_num_rooms;
        if (Array.isArray(aptPref.preferred_num_rooms) && 
            aptPref.preferred_num_rooms.includes(userApt.num_rooms)) {
          aptScore += APARTMENT_WEIGHTS.preferred_num_rooms;
        }

        // Price range match
        aptMax += APARTMENT_WEIGHTS.preferred_price;
        if (
          typeof aptPref.preferred_price_min === 'number' &&
          typeof aptPref.preferred_price_max === 'number' &&
          typeof userApt.price_per_month === 'number'
        ) {
          aptScore += linearWindowScore(
            userApt.price_per_month,
            aptPref.preferred_price_min,
            aptPref.preferred_price_max,
            APARTMENT_WEIGHTS.preferred_price
          );
        }

        // Date of entry match
        aptMax += APARTMENT_WEIGHTS.preferred_date_of_entry;
        if (aptPref.preferred_date_of_entry && userApt.date_of_entry) {
          const diffDays = (new Date(userApt.date_of_entry) -
                          new Date(aptPref.preferred_date_of_entry)) / 864e5;
          if (diffDays <= 0)        aptScore += APARTMENT_WEIGHTS.preferred_date_of_entry;
          else if (diffDays <= 30)  aptScore += APARTMENT_WEIGHTS.preferred_date_of_entry * 0.5;
        }
      }

      const apartmentMatch = aptMax > 0 ? (aptScore / aptMax) : 0;

      // 5. Combine scores (70% roommate preferences, 30% apartment preferences)
      const raw = roommateMatch * 0.7 + apartmentMatch * 0.3;  // 0-1
      const finalScore = Math.round(40 + 60 * raw);            // 40-100
      results.push({
        roommate: {
          id: potentialRoommate.id,
          full_name: potentialRoommate.full_name,
          email: potentialRoommate.email,
          profile_image_url: potentialRoommate.profile_image_url,
          age: potentialRoommate.age,
          gender: potentialRoommate.gender,
          interests: potentialRoommate.interests,
          bio: potentialRoommate.bio,
          preferences: roommatePref,
          apartmentPreferences: aptPref
        },
        match_score: finalScore
      });
      console.log("Pushed roommate:", potentialRoommate.id, "score:", finalScore);
    }

    // Sort by score descending, take top 4, fill with randoms if needed
    results.sort((a, b) => b.match_score - a.match_score);
    console.log("Results before fallback:", results.length);
    
    while (results.length < 9) {
      // Add random users (score 0) if not enough
      const unused = potentialRoommates.filter(user => 
        !results.some(r => r.roommate.id === user.id) && user.id !== userId
      );
      if (unused.length === 0) break;
      const rand = unused[Math.floor(Math.random() * unused.length)];
      results.push({
        roommate: {
          id: rand.id,
          full_name: rand.full_name,
          email: rand.email,
          profile_image_url: rand.profile_image_url,
          age: rand.age,
          gender: rand.gender,
          interests: rand.interests,
          bio: rand.bio,
          preferences: rand.preferences,
          apartmentPreferences: rand.apartmentPreferences
        },
        match_score: 0
      });
      console.log("Added fallback roommate:", rand.id);
    }

    console.log("Final results:", results.slice(0, 9).map(r => ({ id: r.roommate.id, score: r.match_score })));
    return results.slice(0, 9);
  } catch (err) {
    console.log("Error in roommate match engine:", err);
    // Fallback: return 9 random users looking for apartments
    try {
      const randomUsers = await User.findAll({
        where: { user_type: "Looking for Apt" },
        order: sequelize.random(),
        limit: 9
      });
      return randomUsers.map(user => ({
        roommate: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          profile_image_url: user.profile_image_url,
          age: user.age,
          gender: user.gender,
          interests: user.interests,
          bio: user.bio,
          preferences: user.preferences,
          apartmentPreferences: user.apartmentPreferences
        },
        match_score: 0
      }));
    } catch (fallbackErr) {
      console.log("Error in fallback:", fallbackErr);
      return [];
    }
  }
} 
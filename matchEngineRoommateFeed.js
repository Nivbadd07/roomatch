import { Apartment, User, UserApartmentPref, UserPreference, sequelize } from './models.js';

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
  preferred_city: 25,          // Higher weight for city
  preferred_area: 10,
  preferred_contract_type: 20, // Higher weight for contract type
  preferred_features: 20,      // Higher weight for features
  preferred_num_rooms: 10,
  preferred_price: 10,
  preferred_date_of_entry: 5
};

export async function calculateRoommateFeedMatches(userId) {
  try {
    // 1. Fetch the current user's preferences and apartment
    const userPref = await UserPreference.findOne({ where: { user_id: userId } });
    const userApt = await Apartment.findOne({ where: { roommate_id: { [sequelize.Op.contains]: [userId] } } });
    
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
        limit: 4
      });
      return randomUsers.map(user => ({ user, score: 0 }));
    }

    for (const potentialRoommate of potentialRoommates) {
      // Skip if this is the same user
      if (potentialRoommate.id === userId) continue;

      // 3. Roommate preferences match score
      let roommateScore = 0;
      let roommateMax = 0;
      const roommatePref = potentialRoommate.preferences;

      if (roommatePref) {
        for (const key of Object.keys(ROOMMATE_WEIGHTS)) {
          roommateMax += ROOMMATE_WEIGHTS[key];
          if (key === 'cleanliness_importance') {
            if (
              typeof userPref.cleanliness_importance === 'number' &&
              typeof roommatePref.cleanliness_importance === 'number' &&
              Math.abs(userPref.cleanliness_importance - roommatePref.cleanliness_importance) <= 1
            ) roommateScore += ROOMMATE_WEIGHTS[key];
          } else if (userPref[key] && roommatePref[key] && userPref[key] === roommatePref[key]) {
            roommateScore += ROOMMATE_WEIGHTS[key];
          }
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
          typeof userApt.price_per_month === 'number' &&
          userApt.price_per_month >= aptPref.preferred_price_min &&
          userApt.price_per_month <= aptPref.preferred_price_max
        ) {
          aptScore += APARTMENT_WEIGHTS.preferred_price;
        }

        // Date of entry match
        aptMax += APARTMENT_WEIGHTS.preferred_date_of_entry;
        if (aptPref.preferred_date_of_entry && userApt.date_of_entry && 
            new Date(userApt.date_of_entry) <= new Date(aptPref.preferred_date_of_entry)) {
          aptScore += APARTMENT_WEIGHTS.preferred_date_of_entry;
        }
      }

      const apartmentMatch = aptMax > 0 ? (aptScore / aptMax) : 0;

      // 5. Combine scores (50% roommate preferences, 50% apartment preferences)
      const finalScore = Math.round((roommateMatch * 0.5 + apartmentMatch * 0.5) * 100);
      results.push({ user: potentialRoommate, score: finalScore });
      console.log("Pushed roommate:", potentialRoommate.id, "score:", finalScore);
    }

    // Sort by score descending, take top 4, fill with randoms if needed
    results.sort((a, b) => b.score - a.score);
    console.log("Results before fallback:", results.length);
    
    while (results.length < 4) {
      // Add random users (score 0) if not enough
      const unused = potentialRoommates.filter(user => 
        !results.some(r => r.user.id === user.id) && user.id !== userId
      );
      if (unused.length === 0) break;
      const rand = unused[Math.floor(Math.random() * unused.length)];
      results.push({ user: rand, score: 0 });
      console.log("Added fallback roommate:", rand.id);
    }

    console.log("Final results:", results.slice(0, 4).map(r => ({ id: r.user.id, score: r.score })));
    return results.slice(0, 4);
  } catch (err) {
    console.log("Error in roommate match engine:", err);
    // Fallback: return 4 random users looking for apartments
    try {
      const randomUsers = await User.findAll({
        where: { user_type: "Looking for Apt" },
        order: sequelize.random(),
        limit: 4
      });
      return randomUsers.map(user => ({ user, score: 0 }));
    } catch (fallbackErr) {
      console.log("Error in fallback:", fallbackErr);
      return [];
    }
  }
} 
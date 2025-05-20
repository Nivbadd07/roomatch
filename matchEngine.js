// matchEngine.js

// Weights for apartment matching criteria
const APARTMENT_WEIGHTS = {
  city: 20,
  area: 15,
  contract_type: 10,
  price: 20,
  date: 10,
  rooms: 15,
  features: 10
};

// Weights for user matching criteria
const USER_WEIGHTS = {
  works_from_home: 15,
  shares_cleaning: 15,
  pet: 10,
  smoking: 15,
  cleanliness: 15,
  cleaning_frequency: 10,
  guest_frequency: 10,
  noise: 10
};

// Calculate match score between user preferences and apartment
function calculateApartmentMatchScore(userPrefs, apartment) {
  let score = 0;
  const totalWeight = Object.values(APARTMENT_WEIGHTS).reduce((a, b) => a + b, 0);

  if (apartment.city === userPrefs.preferred_city) score += APARTMENT_WEIGHTS.city;
  if (apartment.area === userPrefs.preferred_area) score += APARTMENT_WEIGHTS.area;
  if (apartment.contract_type === userPrefs.preferred_contract_type) score += APARTMENT_WEIGHTS.contract_type;
  if (
    apartment.price_per_month >= userPrefs.preferred_price_min &&
    apartment.price_per_month <= userPrefs.preferred_price_max
  ) score += APARTMENT_WEIGHTS.price;
  if (apartment.date_of_entry <= userPrefs.preferred_date_of_entry) score += APARTMENT_WEIGHTS.date;
  if (userPrefs.preferred_num_rooms && userPrefs.preferred_num_rooms.includes(apartment.num_rooms))
    score += APARTMENT_WEIGHTS.rooms;

  // Features match
  if (userPrefs.preferred_features && apartment.features) {
    const matchingFeatures = apartment.features.filter(f => userPrefs.preferred_features.includes(f));
    if (matchingFeatures.length) {
      const featureScore = (matchingFeatures.length / userPrefs.preferred_features.length) * APARTMENT_WEIGHTS.features;
      score += featureScore;
    }
  }

  return Math.round((score / totalWeight) * 100);
}

// Calculate match score between apartment/owner and potential roommate
function calculateRoommateMatchScore(apartment, ownerPrefs, roommate, roommatePrefs) {
  let score = 0;
  const totalWeight = Object.values(USER_WEIGHTS).reduce((a, b) => a + b, 0);

  // Check if roommate's preferences match the apartment
  const aptMatchScore = calculateApartmentMatchScore(roommatePrefs, apartment);
  if (aptMatchScore < 50) return 0; // Minimum threshold

  // Compare user preferences
  if (ownerPrefs && roommate.user_preferences) {
    if (ownerPrefs.works_from_home === roommate.user_preferences.works_from_home)
      score += USER_WEIGHTS.works_from_home;
    if (ownerPrefs.shares_cleaning === roommate.user_preferences.shares_cleaning)
      score += USER_WEIGHTS.shares_cleaning;
    if (ownerPrefs.pet === roommate.user_preferences.pet)
      score += USER_WEIGHTS.pet;
    if (ownerPrefs.smoking === roommate.user_preferences.smoking)
      score += USER_WEIGHTS.smoking;
    // Cleanliness level
    if (
      typeof ownerPrefs.cleanliness === 'number' &&
      typeof roommate.user_preferences.cleanliness === 'number'
    ) {
      const cleanlinessDiff = Math.abs(ownerPrefs.cleanliness - roommate.user_preferences.cleanliness);
      if (cleanlinessDiff <= 1) score += USER_WEIGHTS.cleanliness;
    }
    if (ownerPrefs.cleaning_frequency === roommate.user_preferences.cleaning_frequency)
      score += USER_WEIGHTS.cleaning_frequency;
    if (ownerPrefs.guest_frequency === roommate.user_preferences.guest_frequency)
      score += USER_WEIGHTS.guest_frequency;
    if (ownerPrefs.noise === roommate.user_preferences.noise)
      score += USER_WEIGHTS.noise;
  }

  return Math.round((score / totalWeight) * 100);
}

module.exports = {
  calculateApartmentMatchScore,
  calculateRoommateMatchScore
}; 
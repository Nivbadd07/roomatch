// matchApi.js
const express = require('express');
const { Apartment, UserApartmentPref, UserPreference, sequelize } = require('./models');
const { calculateApartmentMatchScore, calculateRoommateMatchScore } = require('./matchEngine');

const router = express.Router();

// GET /api/match/apartments/:user_id
router.get('/api/match/apartments/:user_id', async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id);
    const userPrefs = await UserApartmentPref.findOne({ where: { user_id: userId } });
    if (!userPrefs) {
      return res.json({ results: [] });
    }
    // Find matching apartments
    const apartments = await Apartment.findAll({
      where: {
        city: userPrefs.preferred_city,
        price_per_month: {
          [sequelize.Op.gte]: userPrefs.preferred_price_min,
          [sequelize.Op.lte]: userPrefs.preferred_price_max
        },
        date_of_entry: {
          [sequelize.Op.lte]: userPrefs.preferred_date_of_entry
        }
      }
    });
    // Calculate match scores
    const scoredMatches = apartments.map(apt => ({
      apartment: apt,
      match_score: calculateApartmentMatchScore(userPrefs, apt)
    }));
    scoredMatches.sort((a, b) => b.match_score - a.match_score);
    res.json({ results: scoredMatches.slice(0, 5) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/match/roommates/:user_id
router.get('/api/match/roommates/:user_id', async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id);
    // Get user's apartment
    const userApt = await Apartment.findOne({ where: { roommate_id: { [sequelize.Op.contains]: [userId] } } });
    if (!userApt) {
      return res.json({ results: [] });
    }
    // Get user's preferences
    const userPrefs = await UserPreference.findOne({ where: { user_id: userId } });
    // Find potential roommates (users looking for apartments)
    // This assumes you have a User model and a way to filter by user_type
    // For now, this is a placeholder
    const potentialRoommates = []; // TODO: Query your User model here
    const scoredMatches = [];
    for (const roommate of potentialRoommates) {
      const roommatePrefs = await UserApartmentPref.findOne({ where: { user_id: roommate.id } });
      if (roommatePrefs) {
        const score = calculateRoommateMatchScore(userApt, userPrefs, roommate, roommatePrefs);
        scoredMatches.push({ roommate, match_score: score });
      }
    }
    scoredMatches.sort((a, b) => b.match_score - a.match_score);
    res.json({ results: scoredMatches.slice(0, 5) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 
// matchApi.js (ES module)
import express from 'express';
import { Op } from 'sequelize';
import { Apartment, UserApartmentPref, UserPreference, sequelize, User } from './models.js';
import { calculateApartmentMatchScore, calculateRoommateMatchScore } from './matchEngineAptFeed.js';
import { calculateApartmentFeedMatches } from './matchEngineAptFeed.js';

const router = express.Router();

// GET /api/match/apartments/:user_id
router.get('/api/match/apartments/:user_id', async (req, res) => {
  console.log('MATCH ROUTE HIT', req.params.user_id);
  try {
    const userId = parseInt(req.params.user_id);
    let matches = await calculateApartmentFeedMatches(userId);

    console.log('User ID:', userId, 'Matches found:', matches.length);

    // If no matches, return 4 random apartments
    if (!matches || matches.length === 0) {
      const apartments = await Apartment.findAll({ order: sequelize.random(), limit: 4 });
      matches = apartments.map(apt => ({ apartment: apt, score: 0 }));
      console.log('Fallback: returning 4 random apartments');
    }

    res.status(200).json({ results: matches });
  } catch (err) {
    console.error('Error in /api/match/apartments:', err);
    // Fallback: return 4 random apartments even on error
    try {
      const apartments = await Apartment.findAll({ order: sequelize.random(), limit: 4 });
      const matches = apartments.map(apt => ({ apartment: apt, score: 0 }));
      res.status(200).json({ results: matches });
    } catch (fallbackErr) {
      res.status(200).json({ results: [] });
    }
  }
});

// GET /api/match/roommates/:user_id
router.get('/api/match/roommates/:user_id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.user_id);
    console.log('[match/roommates] userId =', userId);

    // Get user's apartment
    const userApt = await Apartment.findOne({ where: { roommate_id: { [Op.contains]: [userId] } } });
    console.log('[match/roommates] userApt =', !!userApt);

    if (!userApt) {
      console.log('[match/roommates] Fallback → returning random users');
      // Return 3 random users looking for Apt if no apartment found
      const randomUsers = await User.findAll({
        where: {
          user_type: 'Looking for Apt',
          id: { [Op.ne]: userId }
        },
        order: sequelize.random(),
        limit: 3
      });
      return res.json({ results: randomUsers.map(roommate => ({ roommate, match_score: null })) });
    }

    // Get user's preferences
    const userPrefs = await UserPreference.findOne({ where: { user_id: userId } });
    console.log('[match/roommates] userPrefs =', !!userPrefs);

    // Find all users looking for an apartment (except the current user)
    const potentialRoommates = await User.findAll({
      where: {
        user_type: 'Looking for Apt',
        id: { [Op.ne]: userId }
      }
    });
    console.log('[match/roommates] potentialRoommates count =', potentialRoommates.length);

    let scoredMatches = [];
    for (const roommate of potentialRoommates) {
      const roommatePrefs = await UserApartmentPref.findOne({ where: { user_id: roommate.id } });
      if (roommatePrefs) {
        const score = calculateRoommateMatchScore(userApt, userPrefs, roommate, roommatePrefs);
        scoredMatches.push({ roommate, match_score: score });
      }
    }
    console.log('[match/roommates] scoredMatches count =', scoredMatches.length);

    scoredMatches.sort((a, b) => b.match_score - a.match_score);
    
    // If no matches, return 3 random users looking for Apt
    if (scoredMatches.length === 0) {
      console.log('[match/roommates] No scored matches → returning random users');
      const randomUsers = await User.findAll({
        where: {
          user_type: 'Looking for Apt',
          id: { [Op.ne]: userId }
        },
        order: sequelize.random(),
        limit: 3
      });
      return res.json({ results: randomUsers.map(roommate => ({ roommate, match_score: null })) });
    }

    console.log('[match/roommates] Success → returning top matches');
    res.json({ results: scoredMatches.slice(0, 5) });
  } catch (err) {
    console.error('[match/roommates] Caught error:', err);
    next(err);  // bubble to global handler
  }
});

export default router; 
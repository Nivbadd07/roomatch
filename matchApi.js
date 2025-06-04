// matchApi.js (ES module)
import express from 'express';
import { Op } from 'sequelize';
import { Apartment, UserApartmentPref, UserPreference, sequelize, User } from './models.js';
import { calculateApartmentMatchScore, calculateRoommateMatchScore } from './matchEngineAptFeed.js';
import { calculateApartmentFeedMatches } from './matchEngineAptFeed.js';
import { calculateRoommateFeedMatches } from './matchEngineRoommateFeed.js';

const router = express.Router();

// GET /api/match/apartments/:user_id
router.get('/api/match/apartments/:user_id', async (req, res) => {
  console.log('MATCH ROUTE HIT', req.params.user_id);
  try {
    const userId = BigInt(req.params.user_id); // Convert to BigInt
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
    const userId = BigInt(req.params.user_id);
    console.log('[match/roommates] userId =', userId);

    const matches = await calculateRoommateFeedMatches(userId);
    console.log('[match/roommates] Matches found:', matches.length);
    console.log('[match/roommates] First match score:', matches[0]?.match_score);
    console.log('[match/roommates] All matches with scores:', matches.map(m => ({ id: m.roommate.id, score: m.match_score })));

    res.json({ results: matches });
  } catch (err) {
    console.error('[match/roommates] Caught error:', err);
    next(err);
  }
});

export default router; 
// matchApi.js (ES module)
import express from 'express';
import { Op } from 'sequelize';
import { Apartment, UserApartmentPref, UserPreference, sequelize, User } from './models.js';
import { calculateApartmentMatchScore, calculateRoommateMatchScore } from './matchEngineAptFeed.js';
import { calculateApartmentFeedMatches } from './matchEngineAptFeed.js';
import { calculateRoommateFeedMatches } from './matchEngineRoommateFeed.js';

const router = express.Router();

// Helper function to normalize scores to 0-100 range
function normalizeScore(score, minScore = 0, maxScore = 1) {
  if (typeof score !== 'number' || isNaN(score)) return 0;
  
  // If score is already 0-100, return it
  if (score >= 0 && score <= 100) return Math.round(score);
  
  // If score is 0-1, scale to 0-100
  if (score >= 0 && score <= 1) return Math.round(score * 100);
  
  // Otherwise normalize to 0-100 range
  const normalized = ((score - minScore) / (maxScore - minScore)) * 100;
  return Math.min(100, Math.max(0, Math.round(normalized)));
}

// GET /api/match/apartments/:user_id
router.get('/api/match/apartments/:user_id', async (req, res) => {
  console.log('MATCH ROUTE HIT', req.params.user_id);
  try {
    const userId = BigInt(req.params.user_id);
    let matches = await calculateApartmentFeedMatches(userId);

    console.log('User ID:', userId, 'Matches found:', matches.length);

    // Normalize all scores to 0-100 range and ensure match_score property
    matches = (matches || []).map(match => {
      const score = match.match_score || match.score || 0;
      return {
        ...match,
        match_score: normalizeScore(score)
      };
    });

    // Sort matches by score in descending order
    matches.sort((a, b) => b.match_score - a.match_score);

    // If no matches, return 4 random apartments with default scores
    if (!matches || matches.length === 0) {
      const apartments = await Apartment.findAll({ order: sequelize.random(), limit: 4 });
      matches = apartments.map(apt => ({ 
        apartment: apt, 
        match_score: 50 // Default middle score for random matches
      }));
      console.log('Fallback: returning 4 random apartments');
    }

    res.status(200).json({ results: matches });
  } catch (err) {
    console.error('Error in /api/match/apartments:', err);
    // Fallback: return 4 random apartments even on error
    try {
      const apartments = await Apartment.findAll({ order: sequelize.random(), limit: 4 });
      const matches = apartments.map(apt => ({ 
        apartment: apt, 
        match_score: 50 // Default middle score for random matches
      }));
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

    let matches = await calculateRoommateFeedMatches(userId);
    
    // Normalize all scores to 0-100 range
    matches = (matches || []).map(match => {
      const score = match.match_score || match.score || 0;
      return {
        ...match,
        match_score: normalizeScore(score)
      };
    });

    // Sort matches by score in descending order
    matches.sort((a, b) => b.match_score - a.match_score);

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
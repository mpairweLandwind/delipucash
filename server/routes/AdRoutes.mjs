import express from 'express';
import {
  createAd,
  getAllAds,
  getAdsByUser,
  updateAd,
  deleteAd,
  trackAdView,
  trackAdClick
} from '../controllers/AdController.mjs';

const router = express.Router();

// Create a new ad
router.post('/create', createAd);

// Get all active ads
router.get('/all', getAllAds);

// Get ads by user
router.get('/user/:userId', getAdsByUser);

// Update an ad
router.put('/update/:id', updateAd);

// Delete an ad
router.delete('/delete/:id', deleteAd);

// Track ad view
router.post('/:id/view', trackAdView);

// Track ad click
router.post('/:id/click', trackAdClick);

export default router;
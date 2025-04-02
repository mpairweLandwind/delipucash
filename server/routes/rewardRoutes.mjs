import express from 'express';
import { addReward, getRewardsByUser } from '../controllers/rewardController.mjs';

const router = express.Router();

// Route to add reward points
router.post('/add', addReward);

// Route to get rewards for a specific user
router.get('/:phoneNumber', getRewardsByUser);

export default router;

import express from 'express';
import {
  createRewardQuestion,
  getAllRewardQuestions,
  getRewardQuestionsByUser,
  updateRewardQuestion,
  deleteRewardQuestion,
  submitRewardQuestionAnswer
} from '../controllers/rewardQuestionController.mjs';

const router = express.Router();

// Create a new reward question (matches frontend: POST /reward-questions/create)
router.post('/create', createRewardQuestion);

// Get all active reward questions (matches frontend: GET /reward-questions/all)
router.get('/all', getAllRewardQuestions);

// Get reward questions by user (matches frontend: GET /reward-questions/user/:userId)
router.get('/user/:userId', getRewardQuestionsByUser);

// Update a reward question (matches frontend: PUT /reward-questions/:id/update)
router.put('/:id/update', updateRewardQuestion);

// Delete a reward question (matches frontend: DELETE /reward-questions/:id/delete)
router.delete('/:id/delete', deleteRewardQuestion);

// Submit an answer to a reward question (matches frontend: POST /reward-questions/:id/answer)
router.post('/:id/answer', submitRewardQuestionAnswer);

export default router; 
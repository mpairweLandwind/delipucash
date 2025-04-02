import prisma from '../lib/prisma.mjs';
import asyncHandler from 'express-async-handler';

// Add Reward Points
export const addReward = asyncHandler(async (req, res) => {
  const { userPhoneNumber, points, description } = req.body;

  const reward = await prisma.reward.create({
    data: {
      user: { connect: { phoneNumber: userPhoneNumber } },
      points,
      description,
    },
  });

  res.status(201).json({ message: 'Reward added', reward });
});

// Get Rewards for User
export const getRewardsByUser = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.params;

  const rewards = await prisma.reward.findMany({
    where: { userPhoneNumber: phoneNumber },
  });

  res.json(rewards);
});

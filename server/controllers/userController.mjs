import bcrypt from 'bcryptjs';
import { errorHandler } from '../utils/error.mjs';
import prisma from '../lib/prisma.mjs';
import asyncHandler from 'express-async-handler';

// User Registration
export const createAppUser = asyncHandler(async (req, res) => {
  const {  phoneNumber, password, firstName ,lastName} = req.body;

  try {
    const userExists = await prisma.appUser.findUnique({ where: { phoneNumber } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.appUser.create({
      data: { phoneNumber, password: hashedPassword, firstName,lastName },
    });

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Add/Remove Liked Videos
export const toggleLikedVideo = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  const { videoId } = req.params;

  try {
    const user = await prisma.appUser.findUnique({ where: { phoneNumber } });

    if (!user) return res.status(404).json({ message: 'User not found' });

    let updatedLikedVideos;

    if (user.likedVideos.includes(videoId)) {
      updatedLikedVideos = user.likedVideos.filter((id) => id !== videoId);
      res.message = 'Removed video from liked videos';
    } else {
      updatedLikedVideos = [...user.likedVideos, videoId];
      res.message = 'Added video to liked videos';
    }

    await prisma.appUser.update({
      where: { phoneNumber },
      data: { likedVideos: updatedLikedVideos },
    });

    res.json({ message: res.message, likedVideos: updatedLikedVideos });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Get All Liked Videos
export const getAllLikedVideos = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const user = await prisma.appUser.findUnique({
      where: { phoneNumber },
      select: { likedVideos: true },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ likedVideos: user.likedVideos });
  } catch (err) {
    errorHandler(err, res);
  }
});

// Fetch User Rewards
export const getUserRewards = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const rewards = await prisma.reward.findMany({
      where: { appUser: { phoneNumber } },
    });

    res.json(rewards);
  } catch (err) {
    errorHandler(err, res);
  }
});

// Fetch Surveys for User
export const getUserSurveys = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const surveys = await prisma.survey.findMany({
      where: { appUser: { phoneNumber } },
    });

    res.json(surveys);
  } catch (err) {
    errorHandler(err, res);
  }
});

// Submit Survey Question Attempts
export const submitQuestionAttempt = asyncHandler(async (req, res) => {
  const { phoneNumber, questionId, answer } = req.body;

  try {
    const attempt = await prisma.questionAttempt.create({
      data: {
        appUser: { connect: { phoneNumber } },
        question: { connect: { id: questionId } },
        answer,
      },
    });

    res.status(201).json({ message: 'Attempt recorded successfully', attempt });
  } catch (err) {
    errorHandler(err, res);
  }
});


export const updateSubscriptionStatus = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const updatedUser = await prisma.appUser.update({
      where: { id: userId },
      data: { subscriptionStatus: status },
    });

    res.json({ message: `Subscription updated to ${status}!`, user: updatedUser });
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({ error: "Failed to update subscription status." });
  }
};

// Get privacy settings
export const getPrivacySettings = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From JWT token

  try {
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: {
        privacySettings: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return default privacy settings if none exist
    const defaultSettings = {
      profileVisibility: 'public',
      showActivity: true,
      allowMessages: true,
      showEmail: false,
      showPhone: false
    };

    res.json(user.privacySettings || defaultSettings);
  } catch (error) {
    console.error("Error fetching privacy settings:", error);
    res.status(500).json({ error: "Failed to fetch privacy settings" });
  }
});

// Update privacy settings
export const updatePrivacySettings = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From JWT token
  const privacySettings = req.body;

  try {
    const updatedUser = await prisma.appUser.update({
      where: { id: userId },
      data: { privacySettings },
    });

    res.json({
      message: "Privacy settings updated successfully",
      privacySettings: updatedUser.privacySettings
    });
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    res.status(500).json({ error: "Failed to update privacy settings" });
  }
});

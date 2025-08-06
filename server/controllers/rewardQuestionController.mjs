import prisma from '../lib/prisma.mjs';
import asyncHandler from 'express-async-handler';

// Create a new reward question
export const createRewardQuestion = asyncHandler(async (req, res) => {
  try {
    console.log("Creating reward question with data:", req.body);

    const { 
      text, 
      options, 
      correctAnswer, 
      rewardAmount, 
      expiryTime, 
      userId 
    } = req.body;

    // Validate required fields
    if (!text || !options || !correctAnswer || !rewardAmount || !userId) {
      return res.status(400).json({ 
        message: "Text, options, correctAnswer, rewardAmount, and userId are required" 
      });
    }

    // Validate reward amount
    if (rewardAmount <= 0) {
      return res.status(400).json({ 
        message: "Reward amount must be greater than 0" 
      });
    }

    // Ensure user exists
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create reward question
    const rewardQuestion = await prisma.rewardQuestion.create({
      data: {
        text,
        options,
        correctAnswer,
        rewardAmount,
        expiryTime: expiryTime ? new Date(expiryTime) : null,
        isActive: true,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    console.log("Reward question created successfully:", rewardQuestion);
    res.status(201).json({ 
      message: "Reward question created successfully", 
      rewardQuestion 
    });

  } catch (error) {
    console.error("Error creating reward question:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Get all active reward questions
export const getAllRewardQuestions = asyncHandler(async (req, res) => {
  try {
    console.log('RewardQuestionController: getAllRewardQuestions - Starting to fetch reward questions from database');
    
    const currentTime = new Date();
    
    const rewardQuestions = await prisma.rewardQuestion.findMany({
      where: { 
        isActive: true,
        OR: [
          { expiryTime: null },
          { expiryTime: { gt: currentTime } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('RewardQuestionController: getAllRewardQuestions - Database query completed:', {
      rewardQuestionsCount: rewardQuestions.length,
      rewardQuestions: rewardQuestions.slice(0, 2).map(rq => ({
        id: rq.id,
        text: rq.text,
        rewardAmount: rq.rewardAmount,
        hasExpiryTime: !!rq.expiryTime,
        userId: rq.userId,
        hasUser: !!rq.user
      }))
    });

    const formattedRewardQuestions = rewardQuestions.map(rq => ({
      id: rq.id,
      text: rq.text,
      options: rq.options,
      correctAnswer: rq.correctAnswer,
      rewardAmount: rq.rewardAmount,
      expiryTime: rq.expiryTime?.toISOString(),
      isActive: rq.isActive,
      userId: rq.userId,
      createdAt: rq.createdAt.getTime(),
      updatedAt: rq.updatedAt.getTime(),
      user: rq.user ? {
        id: rq.user.id,
        firstName: rq.user.firstName || 'Anonymous',
        lastName: rq.user.lastName || '',
        avatar: rq.user.avatar
      } : null
    }));

    console.log('RewardQuestionController: getAllRewardQuestions - Sending response:', {
      rewardQuestionsCount: formattedRewardQuestions.length,
      message: "All reward questions fetched successfully"
    });

    res.json({ 
      message: "All reward questions fetched successfully", 
      rewardQuestions: formattedRewardQuestions
    });
  } catch (error) {
    console.error("RewardQuestionController: getAllRewardQuestions - Error occurred:", error);
    res.status(500).json({ message: "Failed to fetch reward questions" });
  }
});

// Get reward questions by user
export const getRewardQuestionsByUser = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    
    const rewardQuestions = await prisma.rewardQuestion.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(rewardQuestions);
  } catch (error) {
    console.error("Error fetching user reward questions:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Update a reward question
export const updateRewardQuestion = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle date fields if present
    if (updateData.expiryTime) {
      updateData.expiryTime = new Date(updateData.expiryTime);
    }

    const updatedRewardQuestion = await prisma.rewardQuestion.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    res.json(updatedRewardQuestion);
  } catch (error) {
    console.error("Error updating reward question:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Delete a reward question
export const deleteRewardQuestion = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.rewardQuestion.delete({
      where: { id },
    });

    res.json({ message: 'Reward question deleted successfully' });
  } catch (error) {
    console.error("Error deleting reward question:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Submit an answer to a reward question
export const submitRewardQuestionAnswer = asyncHandler(async (req, res) => {
  try {
    const { rewardQuestionId, userEmail, selectedAnswer } = req.body;

    // Validate required fields
    if (!rewardQuestionId || !userEmail || !selectedAnswer) {
      return res.status(400).json({ 
        message: "Reward question ID, user email, and selected answer are required" 
      });
    }

    // Get the reward question
    const rewardQuestion = await prisma.rewardQuestion.findUnique({
      where: { id: rewardQuestionId }
    });

    if (!rewardQuestion) {
      return res.status(404).json({ message: "Reward question not found" });
    }

    // Check if question is active and not expired
    if (!rewardQuestion.isActive) {
      return res.status(400).json({ message: "This reward question is not active" });
    }

    if (rewardQuestion.expiryTime && new Date() > rewardQuestion.expiryTime) {
      return res.status(400).json({ message: "This reward question has expired" });
    }

    // Check if answer is correct
    const isCorrect = selectedAnswer === rewardQuestion.correctAnswer;

    // Create question attempt
    const questionAttempt = await prisma.questionAttempt.create({
      data: {
        userEmail,
        questionId: rewardQuestionId,
        selectedAnswer,
        isCorrect,
        attemptedAt: new Date()
      }
    });

    // Create reward question attempt relation
    await prisma.rewardQuestionOnAttempt.create({
      data: {
        rewardQuestionId,
        questionAttemptId: questionAttempt.id
      }
    });

    // If answer is correct, award points to user
    if (isCorrect) {
      await prisma.appUser.update({
        where: { email: userEmail },
        data: {
          points: {
            increment: rewardQuestion.rewardAmount
          }
        }
      });

      // Create reward record
      await prisma.reward.create({
        data: {
          userEmail,
          points: rewardQuestion.rewardAmount,
          description: `Correct answer to reward question: ${rewardQuestion.text.substring(0, 50)}...`
        }
      });
    }

    res.json({ 
      message: isCorrect ? "Correct answer! Points awarded." : "Incorrect answer. Try again!",
      isCorrect,
      pointsAwarded: isCorrect ? rewardQuestion.rewardAmount : 0
    });

  } catch (error) {
    console.error("Error submitting reward question answer:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}); 
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
      userId,
      isInstantReward = false,
      maxWinners = 2,
      paymentProvider,
      phoneNumber
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

    // Validate instant reward fields
    if (isInstantReward) {
      if (!paymentProvider || !phoneNumber) {
        return res.status(400).json({ 
          message: "Payment provider and phone number are required for instant reward questions" 
        });
      }
      if (!['MTN', 'AIRTEL'].includes(paymentProvider)) {
        return res.status(400).json({ 
          message: "Payment provider must be either MTN or AIRTEL" 
        });
      }
      if (maxWinners < 1 || maxWinners > 10) {
        return res.status(400).json({ 
          message: "Max winners must be between 1 and 10" 
        });
      }
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
        isInstantReward,
        maxWinners,
        paymentProvider: isInstantReward ? paymentProvider : null,
        phoneNumber: isInstantReward ? phoneNumber : null,
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
      isInstantReward: rq.isInstantReward,
      maxWinners: rq.maxWinners,
      winnersCount: rq.winnersCount,
      isCompleted: rq.isCompleted,
      paymentProvider: rq.paymentProvider,
      phoneNumber: rq.phoneNumber,
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

// Get instant reward questions only
export const getInstantRewardQuestions = asyncHandler(async (req, res) => {
  try {
    console.log('RewardQuestionController: getInstantRewardQuestions - Starting to fetch instant reward questions');
    
    const currentTime = new Date();
    
    const instantRewardQuestions = await prisma.rewardQuestion.findMany({
      where: { 
        isActive: true,
        isInstantReward: true,
        isCompleted: false, // Only show questions that haven't been completed
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
        winners: {
          select: {
            id: true,
            userEmail: true,
            position: true,
            amountAwarded: true,
            paymentStatus: true,
            createdAt: true
          },
          orderBy: {
            position: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedInstantRewardQuestions = instantRewardQuestions.map(rq => ({
      id: rq.id,
      text: rq.text,
      options: rq.options,
      correctAnswer: rq.correctAnswer,
      rewardAmount: rq.rewardAmount,
      expiryTime: rq.expiryTime?.toISOString(),
      isActive: rq.isActive,
      userId: rq.userId,
      isInstantReward: rq.isInstantReward,
      maxWinners: rq.maxWinners,
      winnersCount: rq.winnersCount,
      isCompleted: rq.isCompleted,
      paymentProvider: rq.paymentProvider,
      phoneNumber: rq.phoneNumber,
      createdAt: rq.createdAt.getTime(),
      updatedAt: rq.updatedAt.getTime(),
      user: rq.user ? {
        id: rq.user.id,
        firstName: rq.user.firstName || 'Anonymous',
        lastName: rq.user.lastName || '',
        avatar: rq.user.avatar
      } : null,
      winners: rq.winners.map(winner => ({
        id: winner.id,
        userEmail: winner.userEmail,
        position: winner.position,
        amountAwarded: winner.amountAwarded,
        paymentStatus: winner.paymentStatus,
        createdAt: winner.createdAt.getTime()
      }))
    }));

    console.log('RewardQuestionController: getInstantRewardQuestions - Sending response:', {
      instantRewardQuestionsCount: formattedInstantRewardQuestions.length,
      message: "Instant reward questions fetched successfully"
    });

    res.json({ 
      message: "Instant reward questions fetched successfully", 
      instantRewardQuestions: formattedInstantRewardQuestions
    });
  } catch (error) {
    console.error("RewardQuestionController: getInstantRewardQuestions - Error occurred:", error);
    res.status(500).json({ message: "Failed to fetch instant reward questions" });
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
    const { rewardQuestionId, userEmail, selectedAnswer, phoneNumber } = req.body;

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

    // Check if question is completed (all winners found)
    if (rewardQuestion.isCompleted) {
      return res.status(400).json({ message: "This question has already been completed. All winners have been found." });
    }

    // Check if user has already won this question
    const existingWinner = await prisma.instantRewardWinner.findUnique({
      where: {
        rewardQuestionId_userEmail: {
          rewardQuestionId,
          userEmail
        }
      }
    });

    if (existingWinner) {
      return res.status(400).json({ message: "You have already won this question." });
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

    let response = {
      message: isCorrect ? "Correct answer! Points awarded." : "Incorrect answer. Try again!",
      isCorrect,
      pointsAwarded: 0,
      isWinner: false,
      position: null,
      paymentStatus: null
    };

    // If answer is correct, handle instant reward logic
    if (isCorrect) {
      if (rewardQuestion.isInstantReward) {
        // Handle instant reward question
        const currentWinnersCount = rewardQuestion.winnersCount;
        const maxWinners = rewardQuestion.maxWinners;

        if (currentWinnersCount < maxWinners) {
          // User is a winner!
          const position = currentWinnersCount + 1;
          
          // Create winner record
          const winner = await prisma.instantRewardWinner.create({
            data: {
              rewardQuestionId,
              userEmail,
              position,
              amountAwarded: rewardQuestion.rewardAmount,
              paymentStatus: 'PENDING',
              paymentProvider: rewardQuestion.paymentProvider,
              phoneNumber: phoneNumber || rewardQuestion.phoneNumber,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });

          // Update question winners count
          await prisma.rewardQuestion.update({
            where: { id: rewardQuestionId },
            data: {
              winnersCount: currentWinnersCount + 1,
              isCompleted: (currentWinnersCount + 1) >= maxWinners
            }
          });

          // Process automatic payment
          let paymentResult = null;
          try {
            paymentResult = await processInstantRewardPayment(winner);
          } catch (paymentError) {
            console.error("Payment processing error:", paymentError);
            // Continue with the response even if payment fails
          }

          response = {
            message: `🎉 Congratulations! You are the ${position}${position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} winner!`,
            isCorrect: true,
            pointsAwarded: rewardQuestion.rewardAmount,
            isWinner: true,
            position,
            paymentStatus: paymentResult?.status || 'PENDING',
            paymentReference: paymentResult?.reference
          };
        } else {
          // Question is full, but answer is correct
          response = {
            message: "Correct answer! However, all winners have already been found for this question.",
            isCorrect: true,
            pointsAwarded: 0,
            isWinner: false,
            position: null,
            paymentStatus: null
          };
        }
      } else {
        // Regular reward question - award points
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

        response.pointsAwarded = rewardQuestion.rewardAmount;
      }
    }

    res.json(response);

  } catch (error) {
    console.error("Error submitting reward question answer:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Process automatic payment for instant reward winners
async function processInstantRewardPayment(winner) {
  try {
    console.log(`Processing payment for winner: ${winner.userEmail}, Amount: ${winner.amountAwarded}, Provider: ${winner.paymentProvider}`);

    // Import payment controller functions
    const { processMtnPayment, processAirtelPayment } = await import('./paymentController.mjs');

    let paymentResult = null;

    if (winner.paymentProvider === 'MTN') {
      paymentResult = await processMtnPayment({
        amount: winner.amountAwarded,
        phoneNumber: winner.phoneNumber,
        userId: winner.userEmail,
        reason: `Instant reward payment - Question winner #${winner.position}`
      });
    } else if (winner.paymentProvider === 'AIRTEL') {
      paymentResult = await processAirtelPayment({
        amount: winner.amountAwarded,
        phoneNumber: winner.phoneNumber,
        userId: winner.userEmail,
        reason: `Instant reward payment - Question winner #${winner.position}`
      });
    }

    if (paymentResult && paymentResult.success) {
      // Update winner record with payment details
      await prisma.instantRewardWinner.update({
        where: { id: winner.id },
        data: {
          paymentStatus: 'SUCCESSFUL',
          paymentReference: paymentResult.reference,
          paidAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`Payment successful for winner ${winner.userEmail}: ${paymentResult.reference}`);
      return {
        status: 'SUCCESSFUL',
        reference: paymentResult.reference
      };
    } else {
      // Update winner record as failed
      await prisma.instantRewardWinner.update({
        where: { id: winner.id },
        data: {
          paymentStatus: 'FAILED',
          updatedAt: new Date()
        }
      });

      console.log(`Payment failed for winner ${winner.userEmail}`);
      return {
        status: 'FAILED',
        reference: null
      };
    }
  } catch (error) {
    console.error(`Error processing payment for winner ${winner.userEmail}:`, error);
    
    // Update winner record as failed
    await prisma.instantRewardWinner.update({
      where: { id: winner.id },
      data: {
        paymentStatus: 'FAILED',
        updatedAt: new Date()
      }
    });

    return {
      status: 'FAILED',
      reference: null
    };
  }
} 
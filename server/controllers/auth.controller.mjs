import asyncHandler from "express-async-handler";
import prisma from '../lib/prisma.mjs';
import bcrypt from 'bcryptjs';
import { errorHandler } from "../utils/error.mjs";
import jwt from 'jsonwebtoken';

// User Signup
export const signup = asyncHandler(async (req, res, next) => {
  console.log("Creating a user");

  const {email, password,firstName,lastName,phone } = req.body;

  // Check if the user already exists
  const userExists = await prisma.appUser.findUnique({ where: {email } });

  if (userExists) {
    console.log("User already exists");
    return res.status(409).send({ message: "User already registered" });
  }


  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user
  const newUser = await prisma.appUser.create({
    data: {
     email,     
      password: hashedPassword,
      firstName,
      lastName,
      phone,
    },
  });

  // Create JWT token
  const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn: '8h' });

  // Send response with user data and token
  res.status(200).send({
    message: "Registered successfully",
    user: {
      id: newUser.id,
    email: newUser.email,
      // image: newUser.image,
    },
    token,
  });
});


// Update user points
export const updateUserPoints = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { points } = req.body;

  console.log(`Updating points for user ${userId} to ${points}`);

  // Validate input
  if (!userId || typeof userId !== "string" || isNaN(points)) {
    return next(errorHandler(400, "Invalid user ID or points value"));
  }

  try {
    // Find the user and update their points
    const updatedUser = await prisma.appUser.update({
      where: { id: userId }, // Pass userId as a string (no parseInt needed)
      data: { points: parseInt(points) }, // Ensure points is an integer
    });

    if (!updatedUser) {
      return next(errorHandler(404, "User not found"));
    }

    // Send success response
    res.status(200).json({
      success: true,
      message: "Points updated successfully!",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        points: updatedUser.points,
      },
    });
  } catch (error) {
    console.error("Failed to update user points:", error);
    next(errorHandler(500, "Failed to update points"));
  }
});
// signin code

// Fetch user points
export const getUserPoints = async (req, res, next) => {
  const { userId } = req.params;

  try {
    // Find the user and select only the points field
    const user = await prisma.appUser.findUnique({
      where: { id: String(userId) }, // Ensure it's a string
      select: { points: true },
    });
    
    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    // Return the user's points
    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to fetch user points:", error);
    next(errorHandler(500, "Failed to fetch user points"));
  }
};


export const signin = asyncHandler(async (req, res, next) => {
  const {email, password } = req.body;
  console.log('Incoming request:', req.body);

  const validUser = await prisma.appUser.findUnique({ where: {email } });

  if (!validUser) {
    console.error('user not found');
    return next(errorHandler(404, 'User not found!'));
  }

  console.log('User found:', validUser);

  if (typeof validUser.password !== 'string') {
    return next(errorHandler(500, 'Invalid password format!'));
  }

  const validPassword = await bcrypt.compare(password, validUser.password);
  if (!validPassword) {
    return next(errorHandler(401, 'Wrong credentials!'));
  }

  const token = jwt.sign({ id: validUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const { password: pass, ...rest } = validUser;
  console.log('successful login');
  
  // Log the user data to ensure the image is included
  console.log('User data to be returned:', rest);

  res.status(200).json({
    success: true,
    token,
    user: rest,
  });
});



// User SignOut
export const signOut = asyncHandler(async (req, res, next) => {
  res.status(200).json('User has been logged out!');
});



export const updateSubscriptionStatus = async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch the user's latest payment
    const latestPayment = await prisma.payment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // Get the most recent payment
    });

    if (!latestPayment) {
      return res.status(404).json({ error: "No payment found for this user." });
    }

    const currentDate = new Date();
    const startDate = new Date(latestPayment.startDate);
    const endDate = new Date(latestPayment.endDate);

    let subscriptionStatus;

    // Check if the current date is within the subscription period
    if (currentDate >= startDate && currentDate <= endDate) {
      subscriptionStatus = 'ACTIVE';
    } else {
      subscriptionStatus = 'INACTIVE';
    }

    // Update the user's subscription status
    const updatedUser = await prisma.appUser.update({
      where: { id: userId },
      data: { subscriptionStatus },
    });

    res.json({
      message: `Subscription updated to ${subscriptionStatus}!`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({ error: "Failed to update subscription status." });
  }
};

// Check Subscription Status
// Check Subscription Status
export const checkSubscriptionStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch the user's subscription status from the AppUser model
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Return the subscription status
    res.json({
      subscriptionStatus: user.subscriptionStatus,
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    res.status(500).json({ error: "Failed to check subscription status." });
  }
});


export const updateSurveySubscriptionStatus = async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch the user's latest payment
    const latestPayment = await prisma.payment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // Get the most recent payment
    });

    if (!latestPayment) {
      return res.status(404).json({ error: "No payment found for this user." });
    }

    const currentDate = new Date();
    const startDate = new Date(latestPayment.startDate);
    const endDate = new Date(latestPayment.endDate);

    let surveysubscriptionStatus;

    // Check if the current date is within the subscription period
    if (currentDate >= startDate && currentDate <= endDate) {
      surveysubscriptionStatus = 'ACTIVE';
    } else {
      surveysubscriptionStatus = 'INACTIVE';
    }

    // Update the user's subscription status
    const updatedUser = await prisma.appUser.update({
      where: { id: userId },
      data: { surveysubscriptionStatus },
    });

    res.json({
      message: `Subscription updated to ${surveysubscriptionStatus}!`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({ error: "Failed to update survey subscription status." });
  }
};

// Check Subscription Status
// Check Subscription Status
export const checkSurveySubscriptionStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch the user's subscription status from the AppUser model
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { surveysubscriptionStatus: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Return the subscription status
    res.json({
      surveysubscriptionStatus: user.surveysubscriptionStatus,
    });
  } catch (error) {
    console.error("Error checking survey subscription status:", error);
    res.status(500).json({ error: "Failed to check  survey subscription status." });
  }
});

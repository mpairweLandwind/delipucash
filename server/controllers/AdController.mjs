import prisma from '../lib/prisma.mjs';
import asyncHandler from 'express-async-handler';

// Create a new ad
export const createAd = asyncHandler(async (req, res) => {
  try {
    const { 
      title,
      description,
      imageUrl,
      targetUrl,
      type = 'regular',
      sponsored = false,
      isActive = true,
      startDate,
      endDate,
      userId
    } = req.body;

    // Validate required fields
    if (!title || !description || !imageUrl || !targetUrl || !userId) {
      return res.status(400).json({ 
        message: "Title, description, imageUrl, targetUrl and userId are required" 
      });
    }

    // Validate ad type
    const validTypes = ['regular', 'featured', 'banner'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ 
        message: "Invalid ad type. Must be 'regular', 'featured', or 'banner'" 
      });
    }

    // Create the ad
    const ad = await prisma.ad.create({
      data: {
        title,
        description,
        imageUrl,
        targetUrl,
        type,
        sponsored,
        isActive,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        userId
      }
    });

    res.status(201).json(ad);
  } catch (error) {
    console.error("Error creating ad:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Get all ads
export const getAllAds = asyncHandler(async (req, res) => {
  try {
    const ads = await prisma.ad.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true } } }
    });

    // Separate ads by type
    const featuredAd = ads.find(ad => ad.type === 'featured');
    const bannerAd = ads.find(ad => ad.type === 'banner');
    const regularAds = ads.filter(ad => ad.type === 'regular' || !ad.type);

    res.json({
      ads: regularAds,
      featuredAd: featuredAd || null,
      bannerAd: bannerAd || null
    });
  } catch (error) {
    console.error("Error fetching ads:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Get ads by user
export const getAdsByUser = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    
    const ads = await prisma.ad.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(ads);
  } catch (error) {
    console.error("Error fetching user ads:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Update an ad
export const updateAd = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle date fields if present
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    const updatedAd = await prisma.ad.update({
      where: { id },
      data: updateData
    });

    res.json(updatedAd);
  } catch (error) {
    console.error("Error updating ad:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Delete an ad
export const deleteAd = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.ad.delete({
      where: { id }
    });

    res.json({ message: "Ad deleted successfully" });
  } catch (error) {
    console.error("Error deleting ad:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Track ad view
export const trackAdView = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const ad = await prisma.ad.update({
      where: { id },
      data: { views: { increment: 1 } }
    });

    res.json({ message: "View tracked", views: ad.views });
  } catch (error) {
    console.error("Error tracking ad view:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Track ad click
export const trackAdClick = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const ad = await prisma.ad.update({
      where: { id },
      data: { clicks: { increment: 1 } }
    });

    res.json({ message: "Click tracked", clicks: ad.clicks });
  } catch (error) {
    console.error("Error tracking ad click:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
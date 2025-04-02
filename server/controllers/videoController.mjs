import prisma from '../lib/prisma.mjs';
import asyncHandler from 'express-async-handler';

// Create a Video
export const createVideo = asyncHandler(async (req, res) => {
  try {
    console.log("Received request data:", req.body);

    const { title, description, videoUrl, thumbnail, userId, duration, timestamp } = req.body;

    // Validate required fields
    if (!title || !videoUrl || !userId || !thumbnail) {
      console.warn("Missing fields:", { title, videoUrl, userId, thumbnail });
      return res.status(400).json({ message: "Title, videoUrl, userId, and thumbnail are required" });
    }

    // Ensure user exists
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.warn("User not found with ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    // Create video record
    const video = await prisma.video.create({
      data: {
        title,
        description: description || "",
        videoUrl,
        thumbnail,
        userId,
        likes: 0,
        views: 0,
        isBookmarked: false,
        comments: undefined, // Fix Prisma validation error
        createdAt: timestamp ? new Date(timestamp) : undefined, // Use timestamp if available
        updatedAt: new Date(),
      },
    });

    console.log("Video created successfully:", video);
    res.status(201).json({ message: "Video created successfully", video });
  } catch (error) {
    console.error("Error creating video:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
// add comment to a video
// Post a Comment on a Video
// This function handles posting a comment on a video
// It validates the input, checks if the user and video exist, and then creates the comment
// It also updates the video's comment count
export const commentPost = asyncHandler(async (req, res) => {
  try {
    const { id: videoId } = req.params;
    const { text, media, user_id, created_at } = req.body;
  console.log("Received request data for comment:", req.body);
    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!text && (!media || media.length === 0)) {
      return res.status(400).json({ message: "Comment text or media is required" });
    }

    // Verify user exists
    const user = await prisma.appUser.findUnique({
      where: { id: user_id },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        text: text || "",
        mediaUrls: media || [],
        userId: user_id,
        videoId: videoId,
        createdAt: new Date(created_at),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update video's comment count
    await prisma.video.update({
      where: { id: videoId },
      data: { commentsCount: { increment: 1 } },
    });

    res.status(201).json({
      message: "Comment posted successfully",
      comment: {
        id: comment.id,
        text: comment.text,
        mediaUrls: comment.mediaUrls,
        userId: comment.userId,
        videoId: comment.videoId,
        timestamp: created_at, // Return original timestamp
        user: comment.user
      },
    });
console.log("Comment posted successfully:", comment);
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).json({ message: "Failed to post comment" });
  }
});
// Get Videos Uploaded by a User
export const getVideosByUser = asyncHandler(async (req, res) => {
  const { userId} = req.params;

  // Fetch videos for the specified user
  const videos = await prisma.video.findMany({
    where: { userId: userId },
  });

  res.json({ message: 'Videos fetched successfully', videos });
});

// Get All Videos (for Streaming or Browsing)
export const getAllVideos = asyncHandler(async (_req, res) => {
  try {
    const videos = await prisma.video.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log( 'refetched videos',videos);

    res.json({ message: "All videos fetched successfully", videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});


// Update Video Information
export const updateVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, videoUrl } = req.body;

  const updatedVideo = await prisma.video.update({
    where: { id },
    data: { title, description, videoUrl },
  });

  res.json({ message: 'Video updated successfully', updatedVideo });
});

// Delete a Video
export const deleteVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.video.delete({
    where: { id },
  });

  res.json({ message: 'Video deleted successfully' });
});
  // Like a Video (Increment Likes)
export const likeVideo = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Atomically increment likes count
    const updatedVideo = await prisma.video.update({
      where: { id },
      data: {
        likes: {
          increment: 1,
        },
      },
    });

    res.json({ 
      message: 'Video liked successfully', 
      video: updatedVideo 
    });

  } catch (error) {
    console.error('Error liking video:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});
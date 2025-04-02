import express from 'express';
import {
  createVideo,
  getVideosByUser,
  getAllVideos,
  updateVideo,
  deleteVideo,likeVideo,commentPost
} from '../controllers/videoController.mjs';

const router = express.Router();

// Route to create a new video
router.post('/create', createVideo);

// Route to get videos uploaded by a specific user
router.get('/user/:phoneNumber', getVideosByUser);

// Route to get all videos
router.get('/all', getAllVideos);

// route to like video
 router.post('/:id/like', likeVideo);
// Route to post comments
router.post('/:id/comments', commentPost);
// Route to ullpdate video details
router.put('/update/:id', updateVideo);

// Route to delete a video
router.delete('/delete/:id', deleteVideo);

export default router;

import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import authRouter from './routes/auth.route.mjs';
import paymentRoutes from './routes/paymentRoutes.mjs';
import connectDB from './config/db.mjs';
import bodyParser from 'body-parser';
import rewardRoutes from './routes/rewardRoutes.mjs';
import questionAttemptRoutes from './routes/questionAttemptRoutes.mjs';
import questionRoutes from './routes/questionRoutes.mjs';
import surveyRoutes from './routes/surveyRoutes.mjs';
import videoRoutes from './routes/videoRoutes.mjs';
import AdRoutes from './routes/AdRoutes.mjs';
import exploreRoutes from './routes/exploreRoutes.mjs';
import rewardQuestionRoutes from './routes/rewardQuestionRoutes.mjs';
import notificationRoutes from './routes/notificationRoutes.mjs';
import userRoutes from './routes/userRoutes.mjs';


dotenv.config();

connectDB();

const app = express();

const __dirname = path.resolve();

// Middleware for logging requests and tokens (for debugging)
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  if (req.headers.authorization) {
    console.log(`Token: ${req.headers.authorization}`);
  }
  next();
});

const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure CORS to allow requests from your frontend
const allowedOrigins = ['http://localhost:3000','exp://192.168.0.117:8081', 'http://localhost:8081']; // Adjust as needed
app.use(cors({
  origin: allowedOrigins,
  credentials: true, // Allow cookies to be sent with requests
}));



// Define API routes // Mount the video routes
app.use('/api/rewards', rewardRoutes);
app.use('/api/attempts', questionAttemptRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/auth', authRouter);
app.use('/api/ads', AdRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/reward-questions', rewardQuestionRoutes);
app.use('/api', notificationRoutes);
app.use('/api/users', userRoutes);



app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

import 'dotenv/config';
import express, { Application, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import logger from './utils/logger';
import { testConnection } from './config/database';
import errorHandler from './middleware/errorHandler';
import notFound from './middleware/notFound';
import routes from './routes';

const app: Application = express();

// Test database connection
testConnection();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') || [
      'http://localhost:3000'
    ],
    credentials: true
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging middleware
app.use(
  morgan('combined', {
    stream: { write: (message: string) => logger.info(message.trim()) }
  })
);

// Health check endpoint
app.get('/health', (res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development'
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;

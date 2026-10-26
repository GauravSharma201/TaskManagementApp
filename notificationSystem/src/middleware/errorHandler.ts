import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface CustomError extends Error {
  statusCode?: number;
  code?: number;
  errors?: any;
}

interface ErrorResponse {
  message: string | string[];
  statusCode: number;
}

const errorHandler = (err: CustomError, _req: Request, res: Response, _next: NextFunction): void => {
  let error: ErrorResponse = {
    message: err.message,
    statusCode: err.statusCode || 500
  };

  // Log error
  logger.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = { message: 'Resource not found', statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error = { message: 'Duplicate field value entered', statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {}).map((val: any) => val.message);
    error = { message, statusCode: 400 };
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    error = { message: 'Validation error', statusCode: 400 };
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    error = { message: 'Duplicate field value entered', statusCode: 400 };
  }

  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    ...(process.env['NODE_ENV'] === 'development' && { stack: err.stack })
  });
};

export default errorHandler;
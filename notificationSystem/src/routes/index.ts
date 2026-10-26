import { Router, Request, Response } from 'express';

const router = Router();

// API version prefix
// router.use('/v1/<sample-route-name>', sampleRoutes);
// Welcome endpoint
router.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Enterprise Node.js API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

export default router;

import { Request, Response } from 'express';
import WorkspaceService from '../services/workspaceService';
import logger from '../utils/logger';
import { createWorkspaceSchema } from '../validation/workspace';
class WorkspaceController {
  static async getWorkspacesByUserId(req: Request, res: Response) {
    const { user } = req;
    if (!user?.id) {
      logger.error('user not found');
      return res.status(401).json({ message: 'user not found' });
    }
    logger.info('fetching workspaces for the user');

    const workspaces = await WorkspaceService.getWorkspacesByUserId(
      Number(user.id)
    );
    logger.info('workspaces fetched', workspaces);
    return res.status(200).json(workspaces);
  }

  static async createWorkspace(req: Request, res: Response) {
    const { user } = req;
    if (!user?.id) {
      logger.error('user not found');
      return res.status(401).json({ message: 'user not found' });
    }

    const { error, value } = createWorkspaceSchema.validate(req.body);
    if (error) {
      logger.error('validation error occured: workspace creations');
      return res.status(400).json({
        status: 'error',
        type: 'validation',
        errors: error.details.map((err) => {
          return {
            field: err.path.join('.'),
            message: err.message
          };
        })
      });
    }
    const { title, description } = value;
    logger.info('creating workspace for the user');
    const workspace = await WorkspaceService.createWorkspace(Number(user.id), {
      title,
      description
    });
    logger.info('workspace created', workspace);
    return res
      .status(201)
      .json({ message: 'workspace created successfully', payload: workspace });
  }
}

export default WorkspaceController;

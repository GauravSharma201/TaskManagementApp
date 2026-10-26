import ProjectService from '../services/projectService';
import logger from '../utils/logger';
import { createProjectSchema } from '../validation/project';
import { Request, Response } from 'express';

class ProjectController {
  static async createProject(req: Request, res: Response) {
    const { user } = req;

    if (!user?.id) {
      logger.error('user not found');
      return res.status(401).json({ message: 'user not found' });
    }
    const { workspaceId } = req.params;
    const { error, value } = createProjectSchema.validate(req.body);
    if (error) {
      logger.error('validtion error occured: project creation');
      return res.status(400).json({
        status: 'error',
        type: 'validation',
        errors: error.details.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    const { title, description } = value;
    logger.info('creating project for the user');
    const project = await ProjectService.createProject(
      Number(workspaceId),
      Number(user.id),
      {
        title,
        description
      }
    );
    logger.info('project created', project);
    return res
      .status(201)
      .json({ message: 'project created successfully', payload: project });
  }
}

export default ProjectController;

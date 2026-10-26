import TaskService from '../services/taskService';
import logger from '../utils/logger';
import { Request, Response } from 'express';
import { createTaskSchema } from '../validation/task';

class TaskController {
  static async createTask(req: Request, res: Response) {
    const { user } = req;

    if (!user?.id) {
      logger.error('user not found');
      return res.status(401).json({ message: 'user not found' });
    }
    const { projectId } = req.params;

    const { error, value } = createTaskSchema.validate(req.body);
    if (error) {
      logger.error('validation error occured: task creation');
      return res.status(400).json({
        status: 'error',
        type: 'validation',
        errors: error.details.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    const {
      title,
      description,
      label,
      priority,
      status,
      assigneeId,
      assignerId,
      startDate,
      endDate,
      category
    } = value;
    logger.info('creating task for the user', user.id);
    const project = await TaskService.createTask({
      title,
      description,
      projectId: Number(projectId),
      label,
      priority,
      status,
      startDate,
      endDate,
      category,
      assigneeId: Number(assigneeId),
      assignerId: Number(assignerId ?? user.id)
    });
    return res
      .status(201)
      .json({ message: 'project created successfully', payload: project });
  }

  static async getTasksByProjectId(req: Request, res: Response) {
    const { user } = req;
    if (!user?.id) {
      logger.error('user not found');
      return res.status(401).json({ message: 'user not found' });
    }
    const { projectId } = req.params;
    const { page, pageSize } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }

    if (!page || !pageSize) {
      return res
        .status(400)
        .json({ message: 'page and pageSize are required' });
    }
    const tasksResp = await TaskService.getTasksByProjectId(
      Number(user.id),
      Number(projectId),
      Number(page),
      Number(pageSize)
    );

    if (!tasksResp) {
      return res.status(404).json({ message: 'tasks not found' });
    }
    logger.info('tasks fetched', tasksResp);
    return res.status(200).json({
      message: 'tasks fetched successfully',
      payload: {
        data: tasksResp.rows,
        metaData: {
          totalCount: tasksResp.count,
          currentPage: Number(page),
          pageSize: Number(pageSize),
          totalPages: Math.ceil(tasksResp.count / Number(pageSize))
        }
      }
    });
  }
}

export default TaskController;

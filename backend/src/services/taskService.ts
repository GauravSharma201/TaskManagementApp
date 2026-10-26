import logger from '../utils/logger';
import Task, { TaskCreationAttributes } from '../models/taskModel';
import ProjectMember from '../models/projectMembersModel';

class TaskService {
  static async getTasksByProjectId(
    userId: number,
    projectId: number,
    page: number,
    pageSize: number
  ) {
    logger.info('checking if user is a member of the project');
    const isMember = await ProjectMember.findOne({
      where: {
        projectId,
        userId: userId
      }
    });

    if (!isMember) {
      logger.warn('user is not a member of the project');
      return null;
    }
    const offset = (page - 1) * pageSize;
    const tasks = await Task.findAndCountAll({
      where: {
        projectId
      },
      limit: pageSize ?? 20,
      offset,
      order: [['createdAt', 'DESC']]
    });
    logger.info(`tasks fetched for project id: ${projectId}`, tasks);
    return tasks;
  }

  static async createTask(payload: TaskCreationAttributes) {
    const resp = await Task.create(payload);
    logger.info(`task created with id: ${resp.id}`, resp);
    return resp;
  }
}

export default TaskService;

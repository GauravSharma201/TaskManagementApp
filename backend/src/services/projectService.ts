import logger from '../utils/logger';
import Project from '../models/projectModel';
import ProjectMember from '../models/projectMembersModel';

class ProjectService {
  static async createProject(
    workspaceId: number,
    userId: number,
    payload: { title: string; description?: string }
  ) {
    const resp = await Project.create({
      title: payload.title,
      description: payload?.description ?? '',
      ownerId: userId,
      workspaceId
    });
    logger.info(`project created with id: ${resp.id}`, resp);

    await ProjectMember.create({
      userId,
      projectId: resp.id
    });
    logger.info(`project member created with id: ${resp.id}`, resp);
    return resp;
  }

  static async addUserToProject(projectId: number, userId: number) {
    const projectResp = await Project.findByPk(projectId);
    if (!projectResp) return null;
    const resp = await ProjectMember.create({
      userId,
      projectId
    });
    logger.info(`project member created with id: ${resp.id}`, resp);
    return resp;
  }
}

export default ProjectService;

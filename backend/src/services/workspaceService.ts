import logger from '../utils/logger';
import WorkspaceMember from '../models/workspaceMembersModel';
import Workspace from '../models/workspaceModel';
import Project from '../models/projectModel';
import ProjectMember from '../models/projectMembersModel';

class WorkspaceService {
  static async getWorkspacesByUserId(id: number) {
    const resp = await Workspace.findAll({
      attributes: ['id', 'title', 'description', 'ownerId'],
      include: [
        {
          model: WorkspaceMember,
          as: 'workspaceMembers',
          attributes: [],
          where: { userId: id },
          required: true
        },
        {
          model: Project,
          as: 'projects',
          attributes: ['id', 'title', 'description'],
          required: true,
          include: [
            {
              model: ProjectMember,
              as: 'projectMembers',
              attributes: [],
              where: { userId: id },
              required: true
            }
          ]
        }
      ]
    });

    logger.info(`wokspace list for user:${id} `, resp);
    return resp;
  }

  static async createWorkspace(
    userId: number,
    payload: { title: string; description: string }
  ) {
    const workspace = await Workspace.create({
      ownerId: userId,
      title: payload?.title,
      description: payload?.description
    });
    logger.info(`workspace created with id: ${workspace.id}`, workspace);

    await WorkspaceMember.create({
      workspaceId: workspace.id,
      userId
    });
    logger.info(`workspace member created with id: ${workspace.id}`, workspace);
    return workspace;
  }

  static async addUserToWorkspace(workspaceId: number, userId: number) {
    const workspaceResp = await Workspace.findByPk(workspaceId);
    if (!workspaceResp) return null;
    const resp = await WorkspaceMember.create({
      workspaceId,
      userId
    });
    logger.info('user added to workspace');
    return resp;
  }

  static async removeUserFromWorkspace(workspaceId: number, userId: number) {
    const deletedCount = await WorkspaceMember.destroy({
      where: { workspaceId, userId }
    });
    if (deletedCount > 0) {
      logger.info(`user ${userId} removed from workspace ${workspaceId}`);
    } else {
      logger.warn(
        `no membership found for user ${userId} in workspace ${workspaceId}`
      );
    }
  }
}

export default WorkspaceService;

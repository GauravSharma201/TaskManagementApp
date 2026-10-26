import Invites, { InvitesCreationAttributes } from '../models/invites';
import ProjectService from './projectService';
import WorkspaceService from './workspaceService';
import { InvitesType } from '../types';
import logger from '../utils/logger';

class InviteService {
  static async registerInvite(
    data: InvitesCreationAttributes
  ): Promise<Invites> {
    return await Invites.create(data);
  }

  static async getInviteById(id: number): Promise<Invites | null> {
    const resp = await Invites.findByPk(id);
    return resp;
  }

  static async inviteAccepted(
    targetId: number,
    targetType: InvitesType,
    userId: number
  ) {
    switch (targetType) {
      case InvitesType.Project: {
        return await ProjectService.addUserToProject(targetId, userId);
      }
      case InvitesType.Workspace: {
        return await WorkspaceService.addUserToWorkspace(targetId, userId);
      }
      default:
        return null;
    }
  }

  static async processInvite(
    inviteId: number,
    skipInviteCheck = false,
    inviteResponse?: Invites,
    userId?: number
  ) {
    let inviteResp = skipInviteCheck ? inviteResponse : null;
    if (!skipInviteCheck) {
      logger.info('checking if invite exists');
      inviteResp = await this.getInviteById(inviteId);
    }
    if (!inviteResp) {
      logger.info('invite not found');
      return { success: false, reason: 'invite_not_found' };
    }

    if (userId) {
      logger.info('user exists, accepting invite and performing side effects');
      const accInviteResp = await this.inviteAccepted(
        inviteResp.targetId,
        inviteResp.targetType,
        userId
      );
      if (!accInviteResp) {
        logger.info('invite not accepted');
        return { success: false, reason: 'invite_not_accepted' };
      }
      logger.info('invite accepted');
      return {
        success: true,
        invite: inviteResp,
        metaData: {
          isUser: true,
          isOrganisation: inviteResp.organisation,
          targetId: inviteResp.targetId,
          targetType: inviteResp.targetType
        }
      };
    } else {
      logger.info('user  does not exists, sending response back to client');
      return {
        success: true,
        invite: inviteResp,
        metaData: {
          isUser: false,
          isOrganisation: inviteResp.organisation,
          targetId: inviteResp.targetId,
          targetType: inviteResp.targetType
        }
      };
    }
  }
}

export default InviteService;

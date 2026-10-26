import Task from '../../models/taskModel';
import User from '../../models/userModel';
import Project from '../../models/projectModel';
import Workspace from '../../models/workspaceModel';
import WorkspaceMember from '../../models/workspaceMembersModel';
import ProjectMember from '../../models/projectMembersModel';
import Session from '../../models/sessionsModel';
import Organisation from '../../models/organisationModel';
import OrganisationMember from '../../models/organisationMembersModel';
import Invites from '../../models/invites';

export interface Model {
  Task: typeof Task;
  User: typeof User;
  Project: typeof Project;
  Workspace: typeof Workspace;
  WorkspaceMember: typeof WorkspaceMember;
  ProjectMember: typeof ProjectMember;
  Session: typeof Session;
  Organisation: typeof Organisation;
  OrganisationMember: typeof OrganisationMember;
  Invites: typeof Invites;
}

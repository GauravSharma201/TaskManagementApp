import { sequelize } from '../config/database';
// import Task from './sampleModel.ts;
import User from './userModel';
import Task from './taskModel';
import Project from './projectModel';
import Workspace from './workspaceModel';
import ProjectMember from './projectMembersModel';
import WorkspaceMember from './workspaceMembersModel';
import Session from './sessionsModel';
import Organisation from './organisationModel';
import OrganisationMember from './organisationMembersModel';
import Invites from './invites';

import { Model } from '../types/models/model';

const models: Model = {
  // <Sample-Models>,
  User,
  Task,
  Project,
  Workspace,
  ProjectMember,
  WorkspaceMember,
  Session,
  Organisation,
  OrganisationMember,
  Invites
};

// Set up associations

/*
centralize association of models , protects against 
cyclic dependency issues
*/

Object.keys(models).forEach((modelName) => {
  const model = models[modelName as keyof typeof models] as any;
  if (model.associate) {
    model.associate(models);
  }
});

export { sequelize };

export default models;

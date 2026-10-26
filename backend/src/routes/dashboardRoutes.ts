import asyncHandler from '../middleware/asyncHandler';
import { Router } from 'express';
import { authenticateUser } from '../middleware/authHandler';
import WorkspaceController from '../controllers/workspaceControllers';
import ProjectController from '../controllers/projectControllers';
import TaskController from '../controllers/TaskControllers';
const dashboardRouter = Router();

dashboardRouter.get(
  '/workspaces',
  authenticateUser,
  asyncHandler(WorkspaceController.getWorkspacesByUserId)
);

dashboardRouter.post(
  '/workspaces',
  authenticateUser,
  asyncHandler(WorkspaceController.createWorkspace)
);

dashboardRouter.post(
  '/workspaces/:workspaceId/projects',
  authenticateUser,
  asyncHandler(ProjectController.createProject)
);

dashboardRouter.get(
  '/projects/:projectId/tasks',
  authenticateUser,
  asyncHandler(TaskController.getTasksByProjectId)
);
export default dashboardRouter;

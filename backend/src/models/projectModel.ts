import { Model, Optional, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { Model as ModelType } from '../types/models/model';

interface ProjectAttributes {
  id: number;
  title: string;
  description?: string;
  ownerId: number;
  workspaceId: number;
}

interface ProjectCreationAttributes extends Optional<ProjectAttributes, 'id'> {}

class Project
  extends Model<ProjectAttributes, ProjectCreationAttributes>
  implements ProjectAttributes
{
  declare id: number;
  declare title: string;
  declare description: string;
  declare ownerId: number;
  declare workspaceId: number;

  static associate(models: ModelType) {
    // later after defining all the models...
    Project.hasMany(models.Task, {
      foreignKey: 'projectId',
      as: 'tasks'
    });

    Project.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner'
    });

    Project.belongsTo(models.Workspace, {
      foreignKey: 'workspaceId',
      as: 'workspace'
    });

    Project.belongsToMany(models.User, {
      through: models.ProjectMember,
      foreignKey: 'projectId',
      otherKey: 'userId',
      as: 'members'
    });

    Project.hasMany(models.ProjectMember, {
      foreignKey: 'projectId',
      as: 'projectMembers'
    });
  }
}

Project.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'owner_id'
    },
    workspaceId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'workspace_id'
    }
  },
  {
    sequelize,
    tableName: 'Projects',
    underscored: true
  }
);

export default Project;

import { Model, Optional, DataTypes } from 'sequelize';
import { sequelize } from '@/config/database';
import { Model as ModelType } from '@/types/models/model';
import WorkspaceMember from './workspaceMembersModel';

interface WorkspaceAttributes {
  id: number;
  title?: string;
  description?: string;
  ownerId: number;
}

interface WorkspaceCreationAttributes extends Optional<
  WorkspaceAttributes,
  'id'
> {}

class Workspace
  extends Model<WorkspaceAttributes, WorkspaceCreationAttributes>
  implements WorkspaceAttributes
{
  declare id: number;
  declare title: string;
  declare description?: string;
  declare ownerId: number;

  static associate(models: ModelType) {
    Workspace.hasMany(models.Project, {
      foreignKey: 'workspaceId',
      as: 'projects'
    });

    Workspace.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner'
    });

    Workspace.belongsToMany(models.User, {
      through: models.WorkspaceMember,
      foreignKey: 'workspaceId',
      otherKey: 'userId',
      as: 'members'
    });

    Workspace.hasMany(WorkspaceMember, {
      foreignKey: 'workspaceId',
      as: 'workspaceMembers'
    });
  }
}

Workspace.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'owner_id'
    }
  },
  {
    sequelize,
    tableName: 'Workspaces',
    underscored: true
  }
);

export default Workspace;

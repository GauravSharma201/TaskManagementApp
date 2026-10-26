import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { Model as ModelType } from '@/types/models/model';
import userHooks from './userHooks';

interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  type?: string;
  verified?: boolean;
}

export interface UserCreationAttributes extends Optional<
  UserAttributes,
  'id'
> {}

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: number;
  declare name: string;
  declare email: string;
  declare phoneNumber: string;
  declare password: string;
  declare type: string;
  declare verified?: boolean;

  public static associate(models: ModelType) {
    User.hasMany(models.Project, {
      foreignKey: 'ownerId',
      as: 'projects'
    });

    User.hasMany(models.Workspace, {
      foreignKey: 'ownerId',
      as: 'workspace'
    });

    User.hasMany(models.Task, {
      foreignKey: 'assigneeId',
      as: 'assignedTasks'
    });

    User.hasMany(models.Task, {
      foreignKey: 'assignerId',
      as: 'createdTasks'
    });

    User.belongsToMany(models.Workspace, {
      through: models.WorkspaceMember,
      foreignKey: 'userId',
      otherKey: 'workspaceId',
      as: 'workspaceMember'
    });

    User.belongsToMany(models.Project, {
      through: models.ProjectMember,
      foreignKey: 'userId',
      otherKey: 'projectId',
      as: 'projectMember'
    });

    User.belongsToMany(models.Organisation, {
      through: models.OrganisationMember,
      foreignKey: 'userId',
      otherKey: 'organisationId'
    });

    User.hasMany(models.OrganisationMember, {
      foreignKey: 'userId',
      as: 'organisationMembers'
    });

    User.hasMany(models.Session, {
      foreignKey: 'userId',
      as: 'sessions'
    });
  }
}

User.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'phone_number'
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'user'
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    sequelize,
    tableName: 'Users',
    underscored: true,
    hooks: userHooks
  }
);

export default User;

import { Model, Optional, DataTypes } from 'sequelize';
import { sequelize } from '@/config/database';
import { Model as ModelType } from '@/types/models/model';
interface WorkspaceMemberAttributes {
  id: number;
  userId: number;
  workspaceId: number;
}

export interface WorkspaceMemberCreationAttributes extends Optional<
  WorkspaceMemberAttributes,
  'id'
> {}

class WorkspaceMember
  extends Model<WorkspaceMemberAttributes, WorkspaceMemberCreationAttributes>
  implements WorkspaceMemberAttributes
{
  declare id: number;
  declare userId: number;
  declare workspaceId: number;

  static associate(models: ModelType) {
    WorkspaceMember.belongsTo(models.User, { foreignKey: 'userId' });
    WorkspaceMember.belongsTo(models.Workspace, { foreignKey: 'workspaceId' });
  }
}

WorkspaceMember.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    workspaceId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'workspace_id'
    },
    userId: { type: DataTypes.BIGINT, allowNull: false, field: 'user_id' }
  },
  {
    sequelize,
    tableName: 'workspace_members',
    underscored: true
  }
);

export default WorkspaceMember;

import { Model, Optional, DataTypes } from 'sequelize';
import { sequelize } from '@/config/database';
import { Model as ModelType } from '@/types/models/model';

interface TaskAttributes {
  id: number;
  title: string;
  description?: string;
  comments?: string;
  label?: string;
  priority?: string;
  status?: string;
  assigneeId?: number;
  assignerId?: number;
  startDate?: Date;
  endDate?: Date;
  category?: string;
  projectId: number;
}

export interface TaskCreationAttributes extends Optional<
  TaskAttributes,
  'id'
> {}

class Task
  extends Model<TaskAttributes, TaskCreationAttributes>
  implements TaskAttributes
{
  declare id: number;
  declare title: string;
  declare description: string;
  declare comments: string;
  declare label: string;
  declare priority: string;
  declare status: string;
  declare assigneeId: number;
  declare assignerId: number;
  declare startDate: Date;
  declare endDate: Date;
  declare category: string;
  declare projectId: number;

  static associate(models: ModelType) {
    Task.belongsTo(models.Project, { foreignKey: 'projectId', as: 'project' });
    Task.belongsTo(models.User, { foreignKey: 'assigneeId', as: 'assignedTo' });
    Task.belongsTo(models.User, { foreignKey: 'assignerId', as: 'assignedBy' });
  }
}

Task.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    label: {
      type: DataTypes.STRING,
      allowNull: true
    },
    priority: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    assigneeId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'assignee_id'
    },
    assignerId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'assigner_id'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'start_date'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_date'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    projectId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'project_id'
    }
  },
  {
    sequelize,
    tableName: 'Tasks',
    underscored: true
  }
);

export default Task;

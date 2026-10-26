import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// 1. Define what a Task looks like in the Database
interface TaskAttributes {
    id: number;
    title: string;
    description?: string;
    status: string;
    priority: string;
    assigneeId?: number;
    assignerId?: number;
    projectId?: number;
    startDate?: Date;
    endDate?: Date;
}

// 2. Define which fields are optional when calling Task.create()
interface TaskCreationAttributes extends Optional<TaskAttributes, 'id'> { }

// 3. Include the generics in the Class definition
class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
    public id!: number;
    public title!: string;
    public description!: string;
    public status!: string;
    public priority!: string;
    public assigneeId!: number;
    public assignerId!: number;
    public projectId!: number;
    public startDate!: Date;
    public endDate!: Date;

    // 4. Add the association method for your index.ts loop
    public static associate(models: any) {
        Task.belongsTo(models.Project, {
            foreignKey: 'projectId',
            as: 'project'
        });
        Task.belongsTo(models.User, {
            foreignKey: 'assigneeId',
            as: 'assignee'
        });
        Task.belongsTo(models.User, {
            foreignKey: 'assignerId',
            as: 'assigner'
        });
    }
}

Task.init({
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    priority: {
        type: DataTypes.STRING,
        allowNull: false,
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
    projectId: {
        type: DataTypes.BIGINT,
        allowNull: true,
        field: 'project_id'
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
    }
}, {
    sequelize,
    tableName: 'tasks',
    underscored: true, // Recommended: automatically handles snake_case for timestamps
});

export default Task;
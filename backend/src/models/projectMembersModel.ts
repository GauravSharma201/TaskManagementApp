import { Model, Optional, DataTypes } from "sequelize";
import { sequelize } from "@/config/database";
import { Model as ModelType } from "@/types/models/model"

interface ProjectMemberAttributes {
    id: number;
    userId: number;
    projectId: number;
}

interface ProjectMemberCreationAttributes extends Optional<ProjectMemberAttributes, 'id'> { }

class ProjectMember extends Model<ProjectMemberAttributes, ProjectMemberCreationAttributes> implements ProjectMemberAttributes {
    declare id: number;
    declare userId: number;
    declare projectId: number;

    static associate(models: ModelType) {
        ProjectMember.belongsTo(models.User, { foreignKey: 'userId' });
        ProjectMember.belongsTo(models.Project, { foreignKey: 'projectId' });
    }
}

ProjectMember.init({
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    projectId: { type: DataTypes.BIGINT, allowNull: false, field: 'project_id' },
    userId: { type: DataTypes.BIGINT, allowNull: false, field: 'user_id' }
}, {
    sequelize,
    tableName: "project_members",
    underscored: true
})

export default ProjectMember;

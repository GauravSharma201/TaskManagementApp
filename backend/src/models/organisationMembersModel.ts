import { Model, Optional, DataTypes } from 'sequelize';
import { sequelize } from '@/config/database';
import { Model as ModelType } from '@/types/models/model';

interface OrganistionMemberAttributes {
  id: number;
  userId: number;
  organisationId: number;
}

interface OrganistionMemberCreationAttributes extends Optional<
  OrganistionMemberAttributes,
  'id'
> {}

class OrganisationMember
  extends Model<
    OrganistionMemberAttributes,
    OrganistionMemberCreationAttributes
  >
  implements OrganistionMemberAttributes
{
  declare id: number;
  declare userId: number;
  declare organisationId: number;

  static associate(models: ModelType) {
    OrganisationMember.belongsTo(models.User, { foreignKey: 'userId' });
    OrganisationMember.belongsTo(models.Organisation, {
      foreignKey: 'organisationId'
    });
  }
}

OrganisationMember.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    organisationId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'organisation_id'
    },
    userId: { type: DataTypes.BIGINT, allowNull: false, field: 'user_id' }
  },
  {
    sequelize,
    tableName: 'organisation_members',
    underscored: true
  }
);

export default OrganisationMember;

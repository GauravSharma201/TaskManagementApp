import { Model, Optional, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { Model as ModelType } from '../types/models/model';

interface OrganisationAttributes {
  id: number;
  name: string;
  email: string;
  address: number;
}

interface OrganisationCreationAttributes extends Optional<
  OrganisationAttributes,
  'id'
> {}

class Organisation
  extends Model<OrganisationAttributes, OrganisationCreationAttributes>
  implements OrganisationAttributes
{
  declare id: number;
  declare name: string;
  declare email: string;
  declare address: number;

  static associate(models: ModelType) {
    // later after defining all the models...
    Organisation.belongsToMany(models.User, {
      through: models.OrganisationMember,
      foreignKey: 'organisationId',
      otherKey: 'userId'
    });
    Organisation.hasMany(models.OrganisationMember, {
      foreignKey: 'organisationId',
      as: 'organistionMembers'
    });
  }
}

Organisation.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'Organisations',
    underscored: true
  }
);

export default Organisation;

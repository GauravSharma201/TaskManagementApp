import { Model, Optional, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { Model as ModelType } from '../types/models/model';
import { InvitesType } from '../types';

interface InvitesAttributes {
  id: number;
  inviter: number;
  email: string;
  organisation?: number;
  targetType: InvitesType;
  targetId: number;
  status?: string;
}

export interface InvitesCreationAttributes extends Optional<
  InvitesAttributes,
  'id'
> {}

class Invites
  extends Model<InvitesAttributes, InvitesCreationAttributes>
  implements InvitesAttributes
{
  declare id: number;
  declare inviter: number;
  declare email: string;
  declare targetType: InvitesType;
  declare targetId: number;
  declare organisation?: number;
  declare status?: string;

  static associate(models: ModelType) {
    // later after defining all the models...
  }
}

Invites.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    inviter: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    organisation: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    targetId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    targetType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending'
    }
  },
  {
    sequelize,
    tableName: 'Invites',
    underscored: true
  }
);

export default Invites;

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { Model as ModelType } from '@/types/models/model';

interface SessionAttributes {
  id: number;
  sessionId: number;
  userId: number;
  userAgent?: string;
  valid?: string;
  ipAddress?: string;
}

interface SessionCreationAttributes extends Optional<SessionAttributes, 'id'> {}

class Session
  extends Model<SessionAttributes, SessionCreationAttributes>
  implements SessionAttributes
{
  declare id: number;
  declare sessionId: number;
  declare userId: number;
  declare userAgent: string;
  declare valid: string;
  declare ipAddress: string;

  public static associate(models: ModelType) {
    Session.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }
}

Session.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true
    },
    valid: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'Sessions',
    underscored: true
  }
);

export default Session;

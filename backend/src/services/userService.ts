import User, { UserCreationAttributes } from '../models/userModel';
import Invites, { InvitesCreationAttributes } from '../models/invites';

class UserService {
  // User service methods would go here
  static async getUserByEmail(email: string): Promise<User | null> {
    return await User.findOne({ where: { email } });
  }

  static async getUserById(id: number): Promise<User | null> {
    return await User.findByPk(id);
  }

  static async markUserVerifiedById(id: number): Promise<User | null> {
    const user = await User.findByPk(id);
    if (!user) {
      return null;
    }
    await user.update({ verified: true });
    return user;
  }

  static async createUser(data: UserCreationAttributes): Promise<User> {
    return await User.create(data);
  }

  static async registerInvite(
    data: InvitesCreationAttributes
  ): Promise<Invites> {
    return await Invites.create(data);
  }

  static async getInviteById(id: number): Promise<Invites | null> {
    return await Invites.findByPk(id);
  }
}

export default UserService;

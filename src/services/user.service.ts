import { UserService } from '@loopback/authentication';
import { repository } from '@loopback/repository';
import { securityId, UserProfile } from '@loopback/security';
import { compare } from 'bcryptjs';
import { User as MyUser } from '../models';
import { UserRepository as MyUserRepo } from '../repositories';

export type Credentials = {
  email: string;
  password: string;
};

export class CustomUserService implements UserService<MyUser, Credentials> {
  constructor(
    @repository(MyUserRepo)
    public userRepository: MyUserRepo,
  ) {}

  async verifyCredentials(credentials: Credentials): Promise<MyUser> {
    const invalidCredentialsError = 'Invalid email or password.';

    const foundUser = await this.userRepository.findOne({
      where: {email: credentials.email},
    });

    if (!foundUser) throw new Error(invalidCredentialsError);

    const credentialsFound = await this.userRepository.findCredentials(
      foundUser.id,
    );

    if (!credentialsFound) throw new Error(invalidCredentialsError);

    const passwordMatched = await compare(
      credentials.password,
      credentialsFound.password,
    );

    if (!passwordMatched) throw new Error(invalidCredentialsError);

    if (!foundUser.approved)
      throw new Error('User activation is still pending.');

    return foundUser;
  }

  convertToUserProfile(user: MyUser): UserProfile {
    return {
      [securityId]: user.id,
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      role: user.role,
      approved: user.approved,
      enabled: user.enabled,
      photo: user.photo,
      favorites: user.favorites,
    };
  }
}

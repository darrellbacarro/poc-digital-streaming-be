import {TokenService} from '@loopback/authentication';
import {
  TokenServiceBindings,
  UserRepository,
  UserServiceBindings,
} from '@loopback/authentication-jwt';
import {
  inject,
  /* inject, Application, CoreBindings, */
  lifeCycleObserver,
  LifeCycleObserver,
} from '@loopback/core';
import {repository} from '@loopback/repository';
import {genSalt, hash} from 'bcryptjs';
import {User} from '../models';
import {CustomUserService} from '../services/user.service';

/**
 * This class will be bound to the application as a `LifeCycleObserver` during
 * `boot`
 */
@lifeCycleObserver('')
export class SeederObserver implements LifeCycleObserver {
  constructor(
    @repository(UserRepository)
    private userRepository: UserRepository,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: CustomUserService,
  ) {}

  /**
   * This method will be invoked when the application initializes. It will be
   * called at most once for a given application instance.
   */
  async init(): Promise<void> {
    // Add your logic for init
  }

  /**
   * This method will be invoked when the application starts.
   */
  async start(): Promise<void> {
    const users = await this.userRepository.find();

    if (users.length === 0) {
      const users = this.generateUsers();

      const password = await hash('12345', await genSalt());
      for (const user of users) {
        const savedUser = await this.userRepository.create(user);
        await this.userRepository
          .userCredentials(savedUser.id)
          .create({password});
      }
      console.log('Users seeded');
    }
  }

  /**
   * This method will be invoked when the application stops.
   */
  async stop(): Promise<void> {
    // Add your logic for stop
  }

  generateUsers(): User[] {
    return [
      new User({
        fullname: 'Administrator',
        email: 'admin@email.com',
        role: 'ADMIN',
      }),
      new User({
        fullname: 'User',
        email: 'user@email.com',
        role: 'USER',
      }),
    ];
  }
}

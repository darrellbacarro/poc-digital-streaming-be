import {authenticate, TokenService} from '@loopback/authentication';
import {
  Credentials,
  TokenServiceBindings,
  UserServiceBindings,
} from '@loopback/authentication-jwt';
import {authorize} from '@loopback/authorization';
import {inject, intercept} from '@loopback/core';
import {Filter, model, property, repository} from '@loopback/repository';
import {
  del,
  get,
  param,
  patch,
  post,
  Request,
  requestBody,
  Response,
  RestBindings,
  SchemaObject,
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {genSalt, hash} from 'bcryptjs';
import _ from 'lodash';
import {ObjectId} from 'mongodb';
import {
  DeleteUserInterceptor,
  UpdateUserReviewInterceptor,
} from '../interceptors';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {User} from '../models';
import {
  MovieRepository,
  UserCredentialRepository,
  UserRepository,
} from '../repositories';
import {CustomUserService} from '../services/user.service';
import {
  FileUploadHandler,
  ResponseSchema,
  TCheckEmailFilter,
  TCheckEmailPayload,
  TUpdateFavoritesPayload,
} from '../types';
import {rawQuery, TResponse, tryCatch} from '../utils';
import {BaseController} from './base.controller';

@model()
export class NewUserRequest extends User {
  @property({type: 'string'})
  password: string;
}

const CredentialsSchema: SchemaObject = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
    },
  },
};

export const CredentialsRequestBody = {
  description: 'Login request payload',
  required: true,
  content: {
    'application/json': {schema: CredentialsSchema},
  },
};

export class UserController extends BaseController {
  constructor(
    @inject(FILE_UPLOAD_SERVICE)
    private uploadService: FileUploadHandler,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: CustomUserService,
    @repository(UserRepository)
    protected repo: UserRepository,
    @repository(MovieRepository)
    protected movieRepo: MovieRepository,
    @repository(UserCredentialRepository)
    protected userCredentialRepo: UserCredentialRepository,
  ) {
    super();
  }

  @post('/users/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<TResponse> {
    return tryCatch(async () => {
      const user = await this.userService.verifyCredentials(credentials);
      const userProfile = this.userService.convertToUserProfile(user);
      const token = await this.jwtService.generateToken(userProfile);
      return {token, user: userProfile};
    }, 'Successfully logged in');
  }

  @authenticate('jwt')
  @get('/users/me', {
    responses: {
      '200': {
        description: 'Return current user',
        content: {
          'application/json': {
            schema: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  async whoAmI(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<TResponse> {
    return tryCatch(async () => {
      const user = await this.repo.findById(currentUserProfile[securityId]);
      return user;
    }, 'Current user data retrieved.');
  }

  @post('/users/register', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': User,
            },
          },
        },
      },
    },
  })
  async signUp(
    @requestBody.file()
    request: Request,
    @inject(RestBindings.Http.RESPONSE)
    response: Response,
  ): Promise<TResponse> {
    return tryCatch(async () => {
      const parsed = await UserController.parseUploadBody(
        this.uploadService,
        request,
        response,
      );

      const newUser = new NewUserRequest(parsed.fields);

      if (parsed.files.length > 0) {
        const photo = parsed.files[0];
        newUser.photo = photo.publicUrl;
      }

      const password = await hash(newUser.password, await genSalt());
      const savedUser = await this.repo.create(_.omit(newUser, 'password'));

      await this.userCredentialRepo.create({
        userId: savedUser.id,
        password,
      });

      return savedUser;
    }, 'Registration successful!');
  }

  @intercept(UpdateUserReviewInterceptor.BINDING_KEY)
  @authenticate('jwt')
  @authorize({allowedRoles: ['ADMIN']})
  @patch('/users/{id}', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': User,
            },
          },
        },
      },
    },
  })
  async updateUser(
    @requestBody.file()
    request: Request,
    @param.path.string('id')
    id: string,
    @inject(RestBindings.Http.RESPONSE)
    response: Response,
  ): Promise<TResponse> {
    return tryCatch(async () => {
      const userFound = await this.repo.findById(id);
      if (!userFound) throw new Error('User not found.');

      const data = await UserController.parseUploadBody(
        this.uploadService,
        request,
        response,
      );

      const userData = new NewUserRequest(data.fields);

      if (data.files.length > 0) {
        const photo = data.files[0];
        userData.photo = photo.publicUrl;
      }

      if (userData.password) {
        const password = await hash(userData.password, await genSalt());
        await this.userCredentialRepo.updateAll({password}, {userId: id});
      }

      const updatedUser = await this.repo.updateById(
        id,
        _.omit(userData, 'password'),
      );
      return updatedUser;
    }, 'User updated successfully!');
  }

  @authenticate('jwt')
  @authorize({allowedRoles: ['ADMIN']})
  @get('/users', {
    responses: {
      '200': {
        description: 'List of all users',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async getAllUsers(
    @param.query.string('q')
    q?: string,
    @param.query.number('page')
    page?: number,
    @param.query.number('limit')
    limit?: number,
    @param.query.string('sort')
    sort?: string,
  ): Promise<TResponse> {
    return tryCatch(async () => {
      const filter: Filter<User> = UserController.buildFilters(
        {
          q,
          page,
          limit,
          sort,
        },
        ['fullname', 'email'],
      );

      const {count: total} = await this.repo.count(filter.where);
      const users = await this.repo.find(filter);
      return {
        total,
        items: users,
      };
    }, 'Users retrieved successfully!');
  }

  @authenticate('jwt')
  @authorize({allowedRoles: ['ADMIN']})
  @get('/users/{id}', {
    responses: {
      '200': {
        description: 'Data of a user',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async getUserById(
    @param.path.string('id')
    id: string,
  ): Promise<TResponse> {
    return tryCatch(
      async () => this.repo.findById(id),
      'User retrieved successfully!',
    );
  }

  @authenticate('jwt')
  @authorize({allowedRoles: ['ADMIN']})
  @del('/users/{id}', {
    responses: {
      '200': {
        description: 'User deletion status',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  @intercept(DeleteUserInterceptor.BINDING_KEY)
  async deleteUserById(
    @param.path.string('id')
    id: string,
  ): Promise<TResponse> {
    return tryCatch(async () => {
      const user = await this.repo.findById(id);
      await this.repo.deleteById(id);

      return user;
    }, 'User deleted successfully!');
  }

  @post('/validate-email', {
    responses: {
      '200': {
        description: 'Validate Email',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async validateEmail(
    @requestBody()
    request: TCheckEmailPayload,
  ): Promise<TResponse> {
    return tryCatch(async () => {
      const exists = await this.checkIfEmailExists(request.email, request.id);
      return {valid: !exists};
    }, 'Email Validated');
  }

  @authenticate('jwt')
  @authorize({allowedRoles: ['USER']})
  @patch('/users/{id}/favorites', {
    responses: {
      '200': {
        description: "Update user's favorite movies",
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async updateFavorites(
    @param.path.string('id')
    id: string,
    @requestBody()
    request: TUpdateFavoritesPayload,
  ): Promise<TResponse> {
    return tryCatch(async () => {
      const user = await this.repo.findById(id);
      if (!user) throw new Error('User not found.');
      const favorites = {...(user.favorites ?? {})};
      Object.keys(request).forEach(key => {
        if (request[key]) favorites[key] = request[key];
        else delete favorites[key];
      });

      await this.repo.updateById(id, {favorites});
      const updatedUser = await this.repo.findById(id);
      return updatedUser;
    }, "User's favorite movies updated successfully!");
  }

  @authenticate('jwt')
  @authorize({allowedRoles: ['USER']})
  @get('/users/{id}/favorites', {
    responses: {
      '200': {
        description: 'User favorite movies',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async getFavorites(
    @param.path.string('id')
    id: string,
  ): Promise<TResponse> {
    return tryCatch(async () => {
      const user = await this.repo.findById(id);
      const favorites = Object.keys(user.favorites ?? {}).map(
        (key: string) => new ObjectId(key),
      );
      const {items: movies} = await rawQuery(this.movieRepo, 'Movie', {
        baseFilter: {_id: {$in: favorites}},
      });
      return movies;
    }, 'User favorite movies');
  }

  /**
   * Checks if an email exists in the database.
   * @param {string} email - the email to check for
   * @param {string} [id] - the id of the user to exclude from the check
   * @returns {boolean} - true if the email exists, false otherwise
   */
  public async checkIfEmailExists(
    email: string,
    id?: string,
  ): Promise<boolean> {
    const where: TCheckEmailFilter = {email};
    const emailExists = await this.repo.findOne({where});

    if (emailExists) {
      if (id && emailExists.id === id) return false;
      return true;
    }

    return false;
  }
}

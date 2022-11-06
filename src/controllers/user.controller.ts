import {authenticate, TokenService} from '@loopback/authentication';
import {
  Credentials,
  MyUserService,
  TokenServiceBindings,
  UserServiceBindings,
} from '@loopback/authentication-jwt';
import {authorize} from '@loopback/authorization';
import {inject} from '@loopback/core';
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
import {FILE_UPLOAD_SERVICE} from '../keys';
import {User} from '../models';
import {UserRepository} from '../repositories';
import {
  FileUploadHandler,
  ResponseSchema,
  TCheckEmailFilter,
  TCheckEmailPayload,
} from '../types';
import {tryCatch} from '../utils';
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
    public userService: MyUserService,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(UserRepository)
    protected repo: UserRepository,
    @inject(RestBindings.Http.RESPONSE)
    private response: Response,
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
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const user = await this.userService.verifyCredentials(credentials);
      const userProfile = this.userService.convertToUserProfile(user);
      const token = await this.jwtService.generateToken(userProfile);
      return {token};
    }, 'Successfully logged in');

    this.response.status(200).send(data);
    return this.response;
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
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const user = await this.repo.findById(currentUserProfile[securityId]);
      return user;
    }, 'Current user data retrieved.');

    this.response.status(200).send(data);
    return this.response;
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
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const parsed = await UserController.parseUploadBody(
        this.uploadService,
        request,
        this.response,
      );

      const newUser = new NewUserRequest(parsed.fields);

      if (parsed.files.length > 0) {
        const photo = parsed.files[0];
        newUser.photo = photo.publicUrl;
      }

      const password = await hash(newUser.password, await genSalt());
      const savedUser = await this.repo.create({
        ..._.omit(newUser, 'password'),
        enabled: newUser.role === 'ADMIN',
        approved: newUser.role === 'ADMIN',
      });

      await this.repo.userCredentials(savedUser.id).create({password});

      return savedUser;
    }, 'Registration successful!');

    this.response.status(200).send(data);
    return this.response;
  }

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
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const userFound = await this.repo.findById(id);
      if (!userFound) throw new Error('User not found.');

      const data = await UserController.parseUploadBody(
        this.uploadService,
        request,
        this.response,
      );

      const userData = new NewUserRequest(data.fields);

      if (data.files.length > 0) {
        const photo = data.files[0];
        userData.photo = photo.publicUrl;
      }

      if (userData.password) {
        const password = await hash(userData.password, await genSalt());
        await this.repo.userCredentials(id).patch({password});
      }

      const updatedUser = await this.repo.updateById(
        id,
        _.omit(userData, 'password'),
      );
      return updatedUser;
    }, 'User updated successfully!');

    this.response.status(200).send(data);
    return this.response;
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
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const filter: Filter<User> = UserController.buildFilters({
        q,
        page,
        limit,
        sort,
      });

      const {count: total} = await this.repo.count(filter.where);
      const users = await this.repo.find(filter);
      return {
        total,
        items: users,
      };
    }, 'Users retrieved successfully!');

    this.response.status(200).send(data);
    return this.response;
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
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const user = await this.repo.findById(id);

      if (!user) throw new Error('User not found.');
      return user;
    }, 'User retrieved successfully!');

    this.response.status(200).send(data);
    return this.response;
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
  async deleteUserById(
    @param.path.string('id')
    id: string,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const user = await this.repo.findById(id);
      if (!user) throw new Error('User not found.');

      await this.repo.deleteById(id);
      return user;
    }, 'User deleted successfully!');

    this.response.status(200).send(data);
    return this.response;
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
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const exists = await this.checkIfEmailExists(request.email, request.id);
      return {valid: !exists};
    }, 'Email Validated');

    this.response.status(200).send(data);
    return this.response;
  }

  private async checkIfEmailExists(
    email: string,
    id?: string,
  ): Promise<boolean> {
    const where: TCheckEmailFilter = {email};
    if (id) where['id'] = {neq: id};

    const emailExists = await this.repo.findOne({where});
    return !!emailExists;
  }
}

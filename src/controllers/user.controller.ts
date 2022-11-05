import {authenticate, TokenService} from '@loopback/authentication';
import {
  Credentials,
  MyUserService,
  TokenServiceBindings,
  UserServiceBindings,
} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {model, property, repository} from '@loopback/repository';
import {
  get,
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
import {UploadService} from '../services/upload.service';
import {tryCatch} from '../utils';
import {BaseController} from './base.controller';

@model()
export class NewUserRequest extends User {
  @property({
    type: 'string',
    required: true,
  })
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
    private uploadService: UploadService,
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
  @get('/me', {
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

  @post('/signup', {
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
      const data = await UserController.parseUploadBody(
        this.uploadService.handler,
        request,
        this.response,
      );

      const newUser = new NewUserRequest(data.fields);

      if (data.files.length > 0) {
        const photo = data.files[0];
        newUser.photo = photo.savedname;
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
}

import {Entity, hasOne, model, property} from '@loopback/repository';
import {UserCredential} from '.';

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

@model()
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    mongodb: {dataType: 'ObjectId'},
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  fullname: string;

  @property({
    type: 'string',
    required: true,
    index: {
      unique: true,
    },
  })
  email: string;

  @property({
    type: 'string',
    default: Role.USER,
  })
  role: Role;

  @property({type: 'string'})
  photo: string;

  @property({
    type: 'boolean',
    default: false,
  })
  enabled: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  approved: boolean;

  @hasOne(() => UserCredential)
  userCredentials: UserCredential;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User; // & UserRelations;

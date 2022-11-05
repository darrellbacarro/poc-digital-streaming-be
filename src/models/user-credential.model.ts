import {belongsTo, Entity, model, property} from '@loopback/repository';
import {User} from '.';

@model()
export class UserCredential extends Entity {
  @property({
    type: 'string',
    id: true,
    mongodb: {dataType: 'ObjectId'},
  })
  id: string;

  @property({
    type: 'string',
    id: true,
  })
  password: string;

  @belongsTo(() => User, {}, {mongodb: {dataType: 'ObjectId'}})
  userId: string;

  constructor(data?: Partial<UserCredential>) {
    super(data);
  }
}

export interface UserCredentialRelations {
  // describe navigational properties here
}

export type UserCredentialWithRelations = UserCredential; // & UserCredentialRelations;

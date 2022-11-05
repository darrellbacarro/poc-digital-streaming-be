import {Entity, model, property} from '@loopback/repository';

export type Gender = 'male' | 'female';

@model()
export class Actor extends Entity {
  @property({
    type: 'string',
    id: true,
    mongodb: {dataType: 'ObjectId'},
  })
  id: string;

  @property({type: 'string'})
  firstname: string;

  @property({type: 'string'})
  lastname: string;

  @property({type: 'string'})
  gender: Gender;

  @property({type: 'string'})
  birthdate: string;

  @property({type: 'string'})
  photo: string;

  @property({type: 'string'})
  bio: string;

  constructor(data?: Partial<Actor>) {
    super(data);
  }
}

export interface ActorRelations {
  // describe navigational properties here
}

export type ActorWithRelations = Actor; // & ActorRelations;

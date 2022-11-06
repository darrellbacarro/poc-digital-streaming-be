import {Entity, model, property} from '@loopback/repository';
import {Genre} from '.';

@model()
export class ActorInfo extends Entity {
  @property({type: 'string'})
  actorId: string;
  @property({type: 'string'})
  name: string;
  @property({type: 'string'})
  photo: string;
}

@model()
export class Movie extends Entity {
  @property({
    type: 'string',
    id: true,
    mongodb: {dataType: 'ObjectId'},
  })
  id: string;

  @property({type: 'string'})
  title: string;

  @property({type: 'string'})
  poster: string;

  @property({type: 'number'})
  cost: number;

  @property({type: 'number'})
  release_year: number;

  @property({type: 'number'})
  rating: number;

  @property({type: 'number'})
  runtime: number;

  @property({type: 'string'})
  plot: string;

  @property({type: 'string'})
  backdrop: string;

  @property({
    type: 'array',
    itemType: 'object',
  })
  genres?: Genre[];

  @property({
    type: 'array',
    itemType: 'object',
  })
  actors?: ActorInfo[];

  [prop: string]: any;

  constructor(data?: Partial<Movie>) {
    super(data);
  }
}

export interface MovieRelations {
  // describe navigational properties here
}

export type MovieWithRelations = Movie; // & MovieRelations;

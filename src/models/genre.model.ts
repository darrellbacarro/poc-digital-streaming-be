import {Entity, model, property} from '@loopback/repository';

@model()
export class Genre extends Entity {
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
  title: string;

  @property({type: 'string'})
  gradient: string;

  constructor(data?: Partial<Genre>) {
    super(data);
  }
}

export interface GenreRelations {
  // describe navigational properties here
}

export type GenreWithRelations = Genre; // & GenreRelations;

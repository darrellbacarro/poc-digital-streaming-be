import {Entity, model, property} from '@loopback/repository';

@model()
class UserInfo extends Entity {
  @property({
    type: 'string',
    required: true,
  })
  userId: string;

  @property({type: 'string'})
  fullname: string;

  @property({type: 'string'})
  photo: string;
}

@model()
class MovieInfo extends Entity {
  @property({
    type: 'string',
    required: true,
  })
  movieId: string;

  @property({type: 'string'})
  title: string;

  @property({type: 'string'})
  poster: string;
}

@model()
export class Review extends Entity {
  @property({
    type: 'string',
    id: true,
    mongodb: {dataType: 'ObjectId'},
  })
  id: string;

  @property({type: 'string'})
  content: string;

  @property({type: 'number'})
  rating: number;

  @property({type: 'boolean', default: false})
  approved: boolean;

  @property({type: 'object'})
  user: UserInfo;

  @property({type: 'object'})
  movie: MovieInfo;

  @property({type: 'date'})
  postedAt: Date;

  constructor(data?: Partial<Review>) {
    super(data);
  }
}

export interface ReviewRelations {
  // describe navigational properties here
}

export type ReviewWithRelations = Review; // & ReviewRelations;

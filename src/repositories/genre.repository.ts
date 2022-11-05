import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongodbDataSource} from '../datasources';
import {Genre, GenreRelations} from '../models';

export class GenreRepository extends DefaultCrudRepository<
  Genre,
  typeof Genre.prototype.id,
  GenreRelations
> {
  constructor(
    @inject('datasources.mongodb') dataSource: MongodbDataSource,
  ) {
    super(Genre, dataSource);
  }
}

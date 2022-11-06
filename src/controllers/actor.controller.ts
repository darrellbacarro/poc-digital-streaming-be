import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject, intercept} from '@loopback/core';
import {Filter, repository} from '@loopback/repository';
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
} from '@loopback/rest';
import _ from 'lodash';
import {UpdateActorMovieInterceptor} from '../interceptors';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {Actor, Movie} from '../models';
import {ActorRepository, MovieRepository} from '../repositories';
import {FileUploadHandler, ResponseSchema} from '../types';
import {tryCatch} from '../utils';
import {BaseController} from './base.controller';

@authorize({allowedRoles: ['ADMIN']})
@authenticate('jwt')
export class ActorController extends BaseController {
  constructor(
    @inject(FILE_UPLOAD_SERVICE)
    private uploadService: FileUploadHandler,
    @repository(ActorRepository)
    public repo: ActorRepository,
    @inject(RestBindings.Http.RESPONSE)
    private response: Response,
    @repository(MovieRepository)
    public movieRepo: MovieRepository,
  ) {
    super();
  }

  @authorize.skip()
  @get('/actors', {
    responses: {
      '200': {
        description: 'Actors List',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async getActors(
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
      const filter: Filter<Actor> = await ActorController.buildFilters({
        q,
        page,
        limit,
        sort,
      });

      const {count: total} = await this.repo.count(filter.where);
      const actors = await this.repo.find(filter);
      return {
        total,
        items: actors,
      };
    }, 'Actors retrieved successfully!');

    return this.response.status(200).send(data);
  }

  @authorize.skip()
  @get('/actors/{id}', {
    responses: {
      '200': {
        description: 'Actor Data',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async getActorById(
    @param.path.string('id') id: string,
    @param.query.boolean('includeMovies')
    includeMovies?: boolean,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const actor = await this.repo.findById(id);
      if (includeMovies) {
        const movies = await this.getMoviesByActorId(id);

        return {
          ...actor,
          movies,
        };
      }
      return actor;
    }, 'Actor retrieved successfully!');

    return this.response.status(200).send(data);
  }

  @post('/actors', {
    responses: {
      '200': {
        description: 'Created Actor Data',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async createActor(
    @requestBody.file()
    request: Request,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const parsed = await ActorController.parseUploadBody(
        this.uploadService,
        request,
        this.response,
      );

      const actorData = new Actor(parsed.fields);

      if (parsed.files.length > 0) {
        const photo = parsed.files[0];
        actorData.photo = photo.publicUrl;
      }

      const actor = await this.repo.create(actorData);
      return actor;
    }, 'Actor created successfully!');

    return this.response.status(200).send(data);
  }

  @intercept(UpdateActorMovieInterceptor.BINDING_KEY)
  @patch('/actors/{id}', {
    responses: {
      '200': {
        description: 'Update Actor Data',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async updateActor(
    @param.path.string('id') id: string,
    @requestBody.file()
    request: Request,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const parsed = await ActorController.parseUploadBody(
        this.uploadService,
        request,
        this.response,
      );

      const actorData = new Actor(parsed.fields);

      if (parsed.files.length > 0) {
        const photo = parsed.files[0];
        actorData.photo = photo.publicUrl;
      }

      await this.repo.updateById(id, actorData);
      const actor = await this.repo.findById(id);

      return actor;
    }, 'Actor updated successfully!');
    return this.response.status(200).send(data);
  }

  @del('/actors/{id}', {
    responses: {
      '200': {
        description: 'Deleted Actor Data',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async deleteActor(@param.path.string('id') id: string): Promise<Response> {
    const data = await tryCatch(async () => {
      const actor = await this.repo.findById(id);
      if (!actor) throw new Error('Actor not found!');

      const movies = await this.getMoviesByActorId(id);
      if (movies.length > 0)
        throw new Error('Actor is casted in a movie. Deletion not allowed!');

      await this.repo.deleteById(id);
      return actor;
    }, 'Actor deleted successfully!');

    return this.response.status(200).send(data);
  }

  private async getMoviesByActorId(id: string): Promise<Movie[]> {
    const movies = await this.repo.execute('Movie', 'find', {
      'actors.actorId': id,
    });
    return (await movies.toArray()).map((movie: any) =>
      _.omit(movie, 'actors'),
    );
  }
}

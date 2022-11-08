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
  requestBody,
  Response,
  RestBindings,
} from '@loopback/rest';
import {UpdateGenreMovieInterceptor} from '../interceptors/update-genre-movie.interceptor';
import {Genre, Movie} from '../models';
import {GenreRepository} from '../repositories';
import {ResponseSchema} from '../types';
import {rawQuery, tryCatch} from '../utils';
import {BaseController} from './base.controller';

@authenticate('jwt')
@authorize({allowedRoles: ['ADMIN']})
export class GenreController extends BaseController {
  constructor(
    @inject(RestBindings.Http.RESPONSE)
    private response: Response,
    @repository(GenreRepository)
    public repo: GenreRepository,
  ) {
    super();
  }

  @post('/genres', {
    responses: {
      '200': {
        description: 'Created Genre',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async createGenre(
    @requestBody()
    genre: Omit<Genre, 'id'>,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const savedGenre = await this.repo.create(genre);
      return savedGenre;
    }, 'Genre Created');
    return this.response.status(200).json(data);
  }

  @intercept(UpdateGenreMovieInterceptor.BINDING_KEY)
  @patch('/genres/{id}', {
    responses: {
      '200': {
        description: 'Updated Genre Data',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async updateGenre(
    @param.path.string('id')
    id: string,
    @requestBody()
    genre: Partial<Genre>,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const updatedGenre = await this.repo.updateById(id, genre);
      return updatedGenre;
    }, 'Genre Updated');

    return this.response.status(200).json(data);
  }

  @authenticate.skip()
  @authorize.skip()
  @get('/genres', {
    responses: {
      '200': {
        description: 'Genres List',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async getGenres(
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
      const filter: Filter<Genre> = GenreController.buildFilters(
        {
          q,
          page,
          limit,
          sort,
        },
        ['title'],
      );

      const {count: total} = await this.repo.count(filter.where);
      const genres = await this.repo.find(filter);
      return {
        total,
        items: genres,
      };
    }, 'Genres retrieved successfully!');

    return this.response.status(200).send(data);
  }

  @authenticate.skip()
  @authorize.skip()
  @get('/genres/{id}', {
    responses: {
      '200': {
        description: 'Genre Details',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async getGenreById(
    @param.path.string('id')
    id: string,
    @param.query.boolean('includeMovies')
    includeMovies?: boolean,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const genre = await this.repo.findById(id);
      if (!genre) throw new Error('Genre not found!');

      if (includeMovies) {
        const {items: movies} = await this.getMoviesByGenreId(id);

        return {
          ...genre,
          movies,
        };
      }

      return genre;
    }, 'Genre retrieved successfully!');

    return this.response.status(200).send(data);
  }

  @del('/genres/{id}', {
    responses: {
      '200': {
        description: 'Details of Deleted Genre',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async deleteGenre(
    @param.path.string('id')
    id: string,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const genre = await this.repo.findById(id);
      if (!genre) throw new Error('Genre not found!');

      const {items: movies} = await this.getMoviesByGenreId(id);
      if (movies.length > 0)
        throw new Error('Some movies are associated. Deletion not allowed!');

      await this.repo.deleteById(id);
      return genre;
    }, 'Genre deleted successfully!');

    return this.response.status(200).send(data);
  }

  private async getMoviesByGenreId(
    id: string,
  ): Promise<{count: number; items: Movie[]}> {
    const result = await rawQuery(this.repo, 'Movie', {
      baseFilter: {'genres.id': id},
      extra: {
        projection: {actors: 0},
      },
    });

    return result;
  }
}

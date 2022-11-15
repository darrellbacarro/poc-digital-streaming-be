import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject} from '@loopback/core';
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
import {FILE_UPLOAD_SERVICE} from '../keys';
import {Movie} from '../models';
import {MovieRepository, ReviewRepository} from '../repositories';
import {FileUploadHandler, ResponseSchema} from '../types';
import {rawQuery, tryCatch} from '../utils';
import {BaseController} from './base.controller';

@authenticate('jwt')
@authorize({allowedRoles: ['ADMIN']})
export class MovieController extends BaseController {
  constructor(
    @inject(FILE_UPLOAD_SERVICE)
    private uploadService: FileUploadHandler,
    @inject(RestBindings.Http.RESPONSE)
    private response: Response,
    @repository(MovieRepository)
    public repo: MovieRepository,
    @repository(ReviewRepository)
    public reviewRepo: ReviewRepository,
  ) {
    super();
  }

  @post('/movies', {
    responses: {
      '200': {
        description: 'Created Movie',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async createMovie(
    @requestBody.file()
    request: Request,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const parsed = await MovieController.parseUploadBody(
        this.uploadService,
        request,
        this.response,
      );

      if (!parsed.files.length)
        throw new Error('No poster and/or backdrop image provided!');

      const movieData = new Movie(parsed.fields);

      if (typeof movieData.genres === 'string') {
        movieData.genres = JSON.parse(movieData.genres);
      }

      if (typeof movieData.actors === 'string') {
        movieData.actors = JSON.parse(movieData.actors);
      }

      for (const file of parsed.files) {
        movieData[file.fieldname] = file.publicUrl;
      }

      const movie = await this.repo.create(movieData);
      return movie;
    }, 'Movie Created');
    return this.response.status(200).json(data);
  }

  @patch('/movies/{id}', {
    responses: {
      '200': {
        description: 'Updated Movie Data',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async updateMovie(
    @param.path.string('id')
    id: string,
    @requestBody.file()
    request: Request,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const parsed = await MovieController.parseUploadBody(
        this.uploadService,
        request,
        this.response,
      );

      const movieData = new Movie(parsed.fields);

      if (movieData.genres && typeof movieData.genres === 'string') {
        movieData.genres = JSON.parse(movieData.genres);
      }

      if (movieData.actors && typeof movieData.actors === 'string') {
        movieData.actors = JSON.parse(movieData.actors);
      }

      for (const file of parsed.files) {
        movieData[file.fieldname] = file.publicUrl;
      }

      await this.repo.updateById(id, movieData);
      const movie = await this.repo.findById(id);

      return movie;
    }, 'Movie Updated');

    return this.response.status(200).json(data);
  }

  @authenticate.skip()
  @authorize.skip()
  @get('/movies', {
    responses: {
      '200': {
        description: 'Movies List',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async getMovies(
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
      const filter: Filter<Movie> = MovieController.buildFilters(
        {
          q,
          page,
          limit,
          sort,
        },
        ['title'],
      );

      const {count: total} = await this.repo.count(filter.where);
      const movies = await this.repo.find({
        ...filter,
      });
      return {
        total,
        items: movies,
      };
    }, 'Movies retrieved successfully!');

    return this.response.status(200).send(data);
  }

  @authenticate.skip()
  @authorize.skip()
  @get('/movies/{id}', {
    responses: {
      '200': {
        description: 'Movie Details',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async getMovieById(
    @param.path.string('id')
    id: string,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const movie = await this.repo.findById(id);
      if (!movie) throw new Error('Movie not found!');

      return movie;
    }, 'Movie retrieved successfully!');

    return this.response.status(200).send(data);
  }

  @del('/movies/{id}', {
    responses: {
      '200': {
        description: 'Details of Deleted Movie',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async deleteMovie(
    @param.path.string('id')
    id: string,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const movie = await this.repo.findById(id);
      if (!movie) throw new Error('Movie not found!');

      await this.repo.deleteById(id);
      return movie;
    }, 'Movie deleted successfully!');

    return this.response.status(200).send(data);
  }

  @authenticate.skip()
  @authorize.skip()
  @get('/movies/{id}/reviews', {
    responses: {
      '200': {
        description: 'Movie Reviews',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async getMovieReviews(
    @param.path.string('id')
    id: string,
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
      const {count, items} = await rawQuery(this.reviewRepo, 'Review', {
        q,
        page,
        limit,
        sort,
        baseFilter: {'movie.movieId': id, approved: true},
        extra: {
          projection: {
            movie: 0,
          },
        },
      });
      return {
        total: count,
        items,
      };
    }, 'Reviews retrieved successfully!');

    return this.response.status(200).send(data);
  }
}

import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  post,
  Request,
  requestBody,
  Response,
  RestBindings,
} from '@loopback/rest';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {Movie} from '../models';
import {MovieRepository} from '../repositories';
import {FileUploadHandler, ResponseSchema} from '../types';
import {tryCatch} from '../utils';
import {BaseController} from './base.controller';

export class MovieController extends BaseController {
  constructor(
    @inject(FILE_UPLOAD_SERVICE)
    private uploadService: FileUploadHandler,
    @inject(RestBindings.Http.RESPONSE)
    private response: Response,
    @repository(MovieRepository)
    public movieRepo: MovieRepository,
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

      const movieData = new Movie(parsed.fields);

      for (const file of parsed.files) {
        switch (file.fieldname) {
          case 'poster':
            movieData.poster = file.publicUrl;
            break;
          case 'backdrop':
            movieData.backdrop = file.publicUrl;
            break;
        }
      }

      const movie = await this.movieRepo.create(movieData);
      return movie;
    }, 'Movie Created');
    return this.response.status(200).json(data);
  }
}

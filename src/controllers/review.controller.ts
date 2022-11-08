import {authenticate} from '@loopback/authentication';
import {UserServiceBindings} from '@loopback/authentication-jwt';
import {authorize} from '@loopback/authorization';
import {inject, intercept} from '@loopback/core';
import {repository} from '@loopback/repository';
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
import {ReviewApprovalInterceptor} from '../interceptors';
import {Review} from '../models';
import {ReviewRepository} from '../repositories';
import {CustomUserService} from '../services/user.service';
import {ResponseSchema} from '../types';
import {rawQuery, tryCatch} from '../utils';
import {BaseController} from './base.controller';

@authenticate('jwt')
export class ReviewController extends BaseController {
  constructor(
    @inject(RestBindings.Http.RESPONSE)
    private response: Response,
    @repository(ReviewRepository)
    public repo: ReviewRepository,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: CustomUserService,
  ) {
    super();
  }

  @authorize({allowedRoles: ['USER']})
  @post('/reviews', {
    responses: {
      '200': {
        description: 'Created Review',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async createReview(
    @requestBody()
    review: Omit<Review, 'id'>,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const savedReview = await this.repo.create({
        ...review,
        postedAt: new Date(),
      });
      return savedReview;
    }, 'Review Submitted');
    return this.response.status(200).json(data);
  }

  @intercept(ReviewApprovalInterceptor.BINDING_KEY)
  @authorize({allowedRoles: ['ADMIN']})
  @patch('/reviews/{id}/approval', {
    responses: {
      '200': {
        description: 'Approved or Disapproved Review Content',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async reviewApproval(
    @param.path.string('id')
    id: string,
    @requestBody()
    approval: {approved: boolean},
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const updatedReview = await this.repo.updateById(id, approval);
      return updatedReview;
    }, 'Review approval updated.');

    return this.response.status(200).json(data);
  }

  @authorize({allowedRoles: ['ADMIN']})
  @get('/reviews', {
    responses: {
      '200': {
        description: 'Reviews List for Admin',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async getReviews(
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
      const {count: total, items} = await rawQuery(this.repo, 'Review', {
        q,
        page,
        limit,
        sort,
        matchFields: ['content', 'user.fullname', 'movie.title'],
      });
      return {
        total,
        items,
      };
    }, 'Reviews retrieved successfully!');

    return this.response.status(200).send(data);
  }

  @authorize({allowedRoles: ['ADMIN']})
  @del('/reviews/{id}', {
    responses: {
      '200': {
        description: 'Reviews List for Admin',
        content: {
          'application/json': {schema: ResponseSchema},
        },
      },
    },
  })
  async deleteReview(
    @param.path.string('id')
    id: string,
  ): Promise<Response> {
    const data = await tryCatch(async () => {
      const review = await this.repo.deleteById(id);
      return review;
    }, 'Review deleted successfully!');

    return this.response.status(200).send(data);
  }
}

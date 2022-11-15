import {UserRepository} from '@loopback/authentication-jwt';
import {
  /* inject, */
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {repository} from '@loopback/repository';
import _ from 'lodash';
import {Review} from '../models';
import {ReviewRepository} from '../repositories';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({tags: {key: UpdateUserReviewInterceptor.BINDING_KEY}})
export class UpdateUserReviewInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${UpdateUserReviewInterceptor.name}`;

  constructor(
    @repository(UserRepository)
    public userRepo: UserRepository,
    @repository(ReviewRepository)
    public reviewRepo: ReviewRepository,
  ) {}

  /**
   * This method is used by LoopBack context to produce an interceptor function
   * for the binding.
   *
   * @returns An interceptor function
   */
  value() {
    return this.intercept.bind(this);
  }

  /**
   * The logic to intercept an invocation
   * @param invocationCtx - Invocation context
   * @param next - A function to invoke next interceptor or the target method
   */
  async intercept(
    invocationCtx: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ) {
    try {
      // Add pre-invocation logic here
      const result = await next();

      if (invocationCtx.methodName === 'updateUser') {
        const id: string = invocationCtx.args[1];
        const reviews = await this.getReviewsByUserId(id);
        const updatedUser = await this.userRepo.findById(id);

        for (const review of reviews) {
          if (review.user.userId === id) {
            const update = {
              ..._.omit(review, 'id'),
              user: {
                userId: id,
                fullname: updatedUser.fullname,
                photo: updatedUser.photo,
              },
            };

            await this.reviewRepo.updateById(review._id, update);
          }
        }
      }

      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  private async getReviewsByUserId(id: string): Promise<Review[]> {
    const reviews = await this.reviewRepo.execute('Review', 'find', {
      'user.userId': id,
    });
    return reviews.toArray();
  }
}

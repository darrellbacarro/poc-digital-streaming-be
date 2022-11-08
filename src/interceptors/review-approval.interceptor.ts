import {
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {repository} from '@loopback/repository';
import {MovieRepository, ReviewRepository} from '../repositories';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({tags: {key: ReviewApprovalInterceptor.BINDING_KEY}})
export class ReviewApprovalInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ReviewApprovalInterceptor.name}`;

  constructor(
    @repository(ReviewRepository)
    public reviewRepo: ReviewRepository,
    @repository(MovieRepository)
    public movieRepo: MovieRepository,
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

      const id = invocationCtx.args[0];
      const review = await this.reviewRepo.findById(id);
      const movieId = review.movie.movieId;

      const data = await this.reviewRepo.execute('Review', 'aggregate', [
        {
          $match: {
            'movie.movieId': movieId,
            approved: true,
          },
        },
        {
          $group: {
            _id: '$movie.movieId',
            avgRating: {$avg: '$rating'},
          },
        },
      ]);

      const rating = (await data.toArray())[0].avgRating;
      await this.movieRepo.updateById(movieId, {rating});

      return result;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

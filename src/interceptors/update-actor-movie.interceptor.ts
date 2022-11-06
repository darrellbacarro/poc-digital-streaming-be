import {
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ActorInfo, Movie} from '../models';
import {ActorRepository, MovieRepository} from '../repositories';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({tags: {key: UpdateActorMovieInterceptor.BINDING_KEY}})
export class UpdateActorMovieInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${UpdateActorMovieInterceptor.name}`;

  constructor(
    @repository(MovieRepository) public movieRepo: MovieRepository,
    @repository(ActorRepository)
    public actorRepo: ActorRepository,
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

      if (invocationCtx.methodName === 'updateActor') {
        const id: string = invocationCtx.args[0];
        const movies = await this.getMoviesByActorId(id);
        const updatedActor = await this.actorRepo.findById(id);

        for (const movie of movies) {
          let actors = [...(movie.actors as ActorInfo[])];

          const actorIndex = actors.findIndex(actor => actor.actorId === id);

          if (actorIndex !== -1 || actorIndex !== undefined) {
            const newActorInfo: any = {
              actorId: updatedActor.id,
              name: `${updatedActor.firstname} ${updatedActor.lastname}`,
              photo: updatedActor.photo,
            };
            actors.splice(actorIndex, 1, newActorInfo);
          }
          await this.movieRepo.updateById(movie._id, {actors});
        }
      }

      return result;
    } catch (err) {
      // Add error handling logic here
      throw err;
    }
  }

  private async getMoviesByActorId(id: string): Promise<Movie[]> {
    const movies = await this.movieRepo.execute('Movie', 'find', {
      'actors.actorId': id,
    });
    return await movies.toArray();
  }
}

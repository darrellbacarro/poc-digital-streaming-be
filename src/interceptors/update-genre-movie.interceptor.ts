import {
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {repository} from '@loopback/repository';
import _ from 'lodash';
import {Movie} from '../models';
import {GenreRepository, MovieRepository} from '../repositories';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({tags: {key: UpdateGenreMovieInterceptor.BINDING_KEY}})
export class UpdateGenreMovieInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${UpdateGenreMovieInterceptor.name}`;

  constructor(
    @repository(MovieRepository) public movieRepo: MovieRepository,
    @repository(GenreRepository) public genreRepo: GenreRepository,
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

      if (invocationCtx.methodName === 'updateGenre') {
        const id: string = invocationCtx.args[0];
        const movies = await this.getMoviesByGenreId(id);
        const updatedGenre = await this.genreRepo.findById(id);

        for (const movie of movies) {
          let genres = movie.genres ?? [];

          const genreIndex = genres.findIndex(genre => genre.id === id);

          if (genreIndex !== -1 || genreIndex !== undefined) {
            genres.splice(genreIndex, 1, updatedGenre);
          }
          await this.movieRepo.updateById(movie._id, {genres});
        }
      }

      return result;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  private async getMoviesByGenreId(id: string): Promise<Movie[]> {
    const movies = await this.movieRepo.execute('Movie', 'find', {
      'genres.id': id,
    });
    return (await movies.toArray()).map((movie: any) =>
      _.omit(movie, 'actors'),
    );
  }
}

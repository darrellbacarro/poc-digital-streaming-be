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

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({tags: {key: DeleteUserInterceptor.BINDING_KEY}})
export class DeleteUserInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${DeleteUserInterceptor.name}`;

  constructor(
    @repository(UserRepository)
    private userRepository: UserRepository,
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

      /**
       * If there is only one user in the database, make that user an admin.
       * @returns None
       */
      const usersCount = await this.userRepository.count();
      if (usersCount.count === 1) {
        const lastUser = await this.userRepository.findOne();
        if (lastUser)
          await this.userRepository.updateById(lastUser.id, {role: 'ADMIN'});
      }

      return result;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

import {
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationMetadata,
  Authorizer,
} from '@loopback/authorization';
import {Provider} from '@loopback/core';
import {repository} from '@loopback/repository';
import {UserRepository} from '../repositories';

export class MyAuthorizationProvider implements Provider<Authorizer> {
  constructor(
    @repository(UserRepository)
    private userRepository: UserRepository,
  ) {}

  value(): Authorizer {
    return this.authorize.bind(this);
  }

  async authorize(
    authCtx: AuthorizationContext,
    metadata: AuthorizationMetadata,
  ) {
    const user = await this.userRepository.findById(authCtx.principals[0].id);
    const allowedRoles = metadata.allowedRoles;

    return allowedRoles?.includes(user.role)
      ? AuthorizationDecision.ALLOW
      : AuthorizationDecision.DENY;
  }
}

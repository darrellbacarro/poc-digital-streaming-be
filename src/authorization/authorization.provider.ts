import {
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationMetadata,
  Authorizer,
} from '@loopback/authorization';
import {Provider} from '@loopback/core';

export class MyAuthorizationProvider implements Provider<Authorizer> {
  value(): Authorizer {
    return this.authorize.bind(this);
  }

  async authorize(
    authCtx: AuthorizationContext,
    metadata: AuthorizationMetadata,
  ) {
    const clientRole = authCtx.principals[0].role;
    const allowedRoles = metadata.allowedRoles;

    return allowedRoles?.includes(clientRole)
      ? AuthorizationDecision.ALLOW
      : AuthorizationDecision.DENY;
  }
}

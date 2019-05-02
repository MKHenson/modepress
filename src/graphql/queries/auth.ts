import { GraphQLFieldConfigMap, GraphQLBoolean } from 'graphql';
import ControllerFactory from '../../core/controller-factory';
import { Request } from 'express';
import { ServerResponse } from 'http';
import { AuthType } from '../models/auth-type';
import { IUserEntry } from '../../types/models/i-user-entry';
import { IAuthenticationResponse } from '../../types/tokens/standard-tokens';
import { IGQLContext } from '../../types/interfaces/i-gql-context';

async function authenticated(req: Request, res: ServerResponse, verbose: boolean) {
  const session = await ControllerFactory.get('sessions').getSession(req);
  let user: IUserEntry<'client' | 'expanded'> | null = null;

  if (session) {
    await ControllerFactory.get('sessions').setSessionHeader(session, req, res);
    user = await ControllerFactory.get('users').getUser({
      username: session.user.username as string,
      verbose
    });
  }

  const response: IAuthenticationResponse = {
    message: session ? 'User is authenticated' : 'User is not authenticated',
    authenticated: session ? true : false,
    user: session ? user : null
  };

  return response;
}

export const authQuery: GraphQLFieldConfigMap<any, any> = {
  authenticated: {
    description: 'Retrieves the active user',
    type: AuthType,
    args: {
      verbose: { type: GraphQLBoolean, defaultValue: false }
    },
    async resolve(parent, args, context: IGQLContext) {
      return await authenticated(context.req, context.res, args.verbose);
    }
  }
};
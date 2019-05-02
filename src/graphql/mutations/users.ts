import { GraphQLFieldConfigMap, GraphQLString, GraphQLBoolean, GraphQLNonNull } from 'graphql';
import ControllerFactory from '../../core/controller-factory';
import { getAuthUser } from '../helpers';
import { UserType } from '../models/user-type';
import { IUserEntry } from '../../types/models/i-user-entry';
import { JsonType } from '../scalars/json';
import { UserPriviledgeEnumType } from '../scalars/user-priviledge';
import { UserPrivilege } from '../../core/enums';
import { IGQLContext } from '../../types/interfaces/i-gql-context';

export const userMutation: GraphQLFieldConfigMap<any, any> = {
  removeUser: {
    type: GraphQLBoolean,
    args: {
      username: { type: new GraphQLNonNull(GraphQLString) }
    },
    async resolve(parent, args, context: IGQLContext) {
      const auth = await getAuthUser(context.req, context.res);
      if (!auth) throw Error('Authentication error');

      if (auth.user!.username !== args.username && auth.user!.privileges === 'regular')
        throw Error('You do not have permission');

      const toRemove = args.username;
      if (!toRemove) throw new Error('Please specify username');

      await ControllerFactory.get('users').removeUser(toRemove);
      return true;
    }
  },
  createUser: {
    type: UserType,
    args: {
      username: { type: new GraphQLNonNull(GraphQLString) },
      email: { type: new GraphQLNonNull(GraphQLString) },
      password: { type: new GraphQLNonNull(GraphQLString) },
      privileges: { type: UserPriviledgeEnumType, defaultValue: 'regular' as UserPrivilege },
      meta: { type: JsonType }
    },
    async resolve(parent, args: IUserEntry<'client'>, context: IGQLContext) {
      const auth = await getAuthUser(context.req, context.res);
      if (!auth.user) throw Error('Authentication error');
      if (auth.user.privileges === 'regular') throw Error('You do not have permission');
      if (args.privileges === 'super') throw new Error('You cannot create a user with super admin permissions');

      const user = await ControllerFactory.get('users').createUser(
        {
          username: args.username,
          email: args.email,
          password: args.password,
          privileges: args.privileges,
          meta: args.meta
        },
        true,
        true
      );

      return user;
    }
  }
};
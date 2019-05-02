import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import { authQuery } from '../graphql/queries/auth';
import { userQuery } from '../graphql/queries/users';
import { commentsQuery } from '../graphql/queries/comments';
import { categoriesQuery } from '../graphql/queries/categories';
import { fileQuery } from '../graphql/queries/files';
import { templateQuery } from '../graphql/queries/templates';
import { postsQuery } from '../graphql/queries/posts';
import { authMutation } from '../graphql/mutations/auth';
import { userMutation } from '../graphql/mutations/users';
import { postsMutation } from '../graphql/mutations/posts';
import { commentsMutation } from '../graphql/mutations/comments';
import { categoriesMutation } from '../graphql/mutations/categories';

const RootQuery: GraphQLObjectType = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    ...userQuery,
    ...fileQuery,
    ...categoriesQuery,
    ...templateQuery,
    ...postsQuery,
    ...authQuery,
    ...commentsQuery
  }
});

const RootMutationType: GraphQLObjectType = new GraphQLObjectType({
  name: 'RootMutationType',
  fields: {
    ...authMutation,
    ...userMutation,
    ...commentsMutation,
    ...postsMutation,
    ...categoriesMutation
  }
});

const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutationType
});

export default schema;
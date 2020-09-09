import { ObjectType, Field, ArgsType, Int, InputType } from 'type-graphql';
import { ObjectId, ObjectID } from 'mongodb';
import { GraphQLObjectId } from '../scalars/object-id';
import { User } from './user-type';
import { LongType } from '../scalars/long';
import { Post } from './post-type';
import { IComment } from '../../types/models/i-comment';
import { Page } from '../../types/tokens/standard-tokens';
import { PaginatedResponse } from './paginated-response';
import { SortOrder, CommentSortType, CommentVisibility } from '../../core/enums';
import { IsValidHtml } from '../../decorators/isValidHtml';

export const allowedCommentTags = [
  'blockquote',
  'p',
  'a',
  'ul',
  'ol',
  'nl',
  'li',
  'b',
  'i',
  'strong',
  'em',
  'strike',
  'code',
  'hr',
  'br',
  'pre'
];
@ObjectType({ description: 'Object representing a Comment' })
export class Comment {
  @Field(type => GraphQLObjectId)
  _id: ObjectId | string;

  @Field(type => String)
  author: string;

  @Field(type => User, { nullable: true })
  user: User | null;

  @Field(type => Post)
  post: Post;

  @Field(type => Comment, { nullable: true })
  parent: Comment;

  @Field(type => Boolean)
  public: boolean;

  @Field()
  content: string;

  @Field(type => [Comment])
  children: Comment[];

  @Field(type => LongType)
  createdOn: number;

  @Field(type => LongType)
  lastUpdated: number;

  static fromEntity(comment: Partial<IComment<'server'>>) {
    const toReturn = new Comment();
    Object.assign(toReturn, comment);
    if (comment.user) toReturn.user = User.fromEntity({ _id: comment.user! });
    if (comment.children) toReturn.children = comment.children.map(child => Comment.fromEntity({ _id: child }));
    if (comment.parent) toReturn.parent = Comment.fromEntity({ _id: comment.parent });
    if (comment.post) toReturn.post = Post.fromEntity({ _id: comment.post });
    return toReturn;
  }
}

@InputType()
export class AddCommentInput {
  @Field(type => GraphQLObjectId, { nullable: true })
  user: ObjectID | string;

  @Field(type => GraphQLObjectId)
  post: ObjectID | string;

  @Field(type => GraphQLObjectId, { nullable: true })
  parent: ObjectID | string;

  @Field(type => Boolean, { defaultValue: true })
  public: boolean;

  @Field()
  @IsValidHtml(true, undefined, allowedCommentTags)
  content: string;

  @Field(type => [GraphQLObjectId], { nullable: true })
  children: (ObjectID | string)[];

  constructor(initialization?: Partial<AddCommentInput>) {
    if (initialization) Object.assign(this, initialization);
  }
}

@InputType()
export class UpdateCommentInput {
  @Field(type => GraphQLObjectId)
  _id: ObjectId | string;

  @Field(type => Boolean, { defaultValue: true })
  public: boolean;

  @Field()
  @IsValidHtml(true, undefined, allowedCommentTags)
  content: string;

  constructor(initialization?: Partial<UpdateCommentInput>) {
    if (initialization) Object.assign(this, initialization);
  }
}

@ArgsType()
export class GetCommentsArgs {
  @Field(type => Boolean, { nullable: true, defaultValue: false })
  root: boolean;

  @Field(type => Int, { defaultValue: 0 })
  index: number = 0;

  @Field(type => Int, { defaultValue: 10 })
  limit: number;

  @Field(type => String, { nullable: true })
  keyword: string;

  @Field(type => String, { nullable: true })
  user: string;

  @Field(type => CommentVisibility, { defaultValue: CommentVisibility.all })
  visibility: CommentVisibility;

  @Field(type => SortOrder, { defaultValue: SortOrder.desc })
  sortOrder: SortOrder;

  @Field(type => CommentSortType, { defaultValue: CommentSortType.created })
  sortType: CommentSortType;

  @Field(type => GraphQLObjectId, { nullable: true })
  parentId: ObjectId;

  @Field(type => GraphQLObjectId, { nullable: true })
  postId: ObjectId;

  constructor(initialization?: Partial<GetCommentsArgs>) {
    initialization && Object.assign(this, initialization);
  }
}

@ObjectType({ description: 'A page of wrapper of comments' })
export class PaginatedCommentsResponse extends PaginatedResponse(Comment) {
  static fromEntity(page: Page<IComment<'server'>>) {
    const toReturn = new PaginatedCommentsResponse();
    toReturn.count = page.count;
    toReturn.index = page.index;
    toReturn.limit = page.limit;
    toReturn.data = page.data.map(cat => Comment.fromEntity(cat));
    return toReturn;
  }
}

// import {
//   GraphQLObjectType,
//   GraphQLString,
//   GraphQLID,
//   GraphQLList,
//   GraphQLBoolean,
//   GraphQLInputObjectType,
//   GraphQLNonNull
// } from 'graphql';
// import { LongType } from '../scalars/long';
// import { UserType } from './user-type';
// import Controllers from '../../core/controller-factory';
// import { IComment } from '../../types/models/i-comment';
// import { PostType } from './post-type';
// import { GraphQLObjectId } from '../scalars/object-id';
// import { IGQLContext } from '../../types/interfaces/i-gql-context';

// export const CommentType: GraphQLObjectType = new GraphQLObjectType({
//   name: 'Comment',
//   fields: () => ({
//     _id: { type: GraphQLID },
//     author: {
//       type: GraphQLString
//     },
//     user: {
//       type: UserType,
//       resolve: (parent: IComment<'client'>, args, context: IGQLContext) => {
//         if (typeof parent.user === 'string')
//           return Controllers.get('users').getUser({
//             id: parent.user as string,
//             verbose: context.verbose,
//             expandForeignKeys: false
//           });
//         else return parent.user;
//       }
//     },
//     post: {
//       type: PostType,
//       resolve: (parent: IComment<'client'>) => {
//         if (typeof parent.post === 'string')
//           return Controllers.get('posts').getPost({ id: parent.post as string, expanded: false });
//         else return parent.post;
//       }
//     },
//     parent: {
//       type: PostType,
//       resolve: (parent: IComment<'client'>) => {
//         if (typeof parent.parent === 'string')
//           return Controllers.get('comments').getOne(parent.parent as string, { expanded: false });
//         else return parent.parent;
//       }
//     },
//     public: { type: GraphQLBoolean },
//     content: { type: GraphQLString },
//     children: {
//       type: new GraphQLList(CommentType),
//       resolve: async (parent: IComment<'client'>) => {
//         const controller = Controllers.get('comments');
//         const children = parent.children as string[];
//         const promises = children.map(c => controller.getOne(c, { verbose: true, expanded: false }));
//         return Promise.all(promises);
//       }
//     },
//     lastUpdated: { type: LongType },
//     createdOn: { type: LongType }
//   })
// });

// export const CommentInputType = new GraphQLInputObjectType({
//   name: 'CommentInput',
//   description: 'Input comment payload',
//   fields: () => ({
//     post: {
//       type: new GraphQLNonNull(GraphQLObjectId)
//     },
//     parent: {
//       type: GraphQLObjectId
//     },
//     public: {
//       type: GraphQLBoolean
//     },
//     content: {
//       type: GraphQLString
//     }
//   })
// });

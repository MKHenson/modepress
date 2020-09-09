﻿// import * as _Controller from './routers/router';
// import { isValidObjectID } from './utils/utils';
// import { CORSRouter } from './routers/cors';
// import { ErrorRouter } from './routers/error';
// import { FileRouter } from './routers/file';
// import { AuthRouter } from './routers/auth';
// import { j200 } from './decorators/responses';
// import { isAuthorizedRest } from './decorators/permissions';

// export const Controller = _Controller.Router;
// export const isValidID = isValidObjectID;
// export const decorators = {
//   j200,
//   authorize: isAuthorizedRest
// };

// export const routers = {
//   /** Endpoints for authenticating users */
//   auth: AuthRouter,
//   // /** Endpoints for managing cross origin allowances */
//   cors: CORSRouter,
//   /** Can be used to catch and return errors */
//   error: ErrorRouter,
//   /** Endpoints for managing user files */
//   file: FileRouter
// };

export {
  CategoriesGetManyOptions,
  PostsGetAllOptions,
  VolumesGetOptions,
  CommentGetAllOptions,
  FilesGetOptions,
  UsersGetAllOptions
} from './core/types';
export { IVolume } from './types/models/i-volume-entry';
export { ITemplate } from './types/models/i-template';
export { IDocument } from './types/models/i-document';
export { IDraft } from './types/models/i-draft';
export { IDraftElement, IImageElement } from './types/models/i-draft-elements';
export { ICategory } from './types/models/i-category';
export { IComment } from './types/models/i-comment';
export { IFileEntry } from './types/models/i-file-entry';
export { IMailer, IMailgun, IMailOptions } from './types/models/i-mail';
export { IModelEntry } from './types/models/i-model-entry';
export { IPost } from './types/models/i-post';
export { IRender } from './types/models/i-render';
export { ISessionEntry } from './types/models/i-session-entry';
export { IUserEntry } from './types/models/i-user-entry';
export { IUploadResponse } from './types/tokens/i-file-tokens';
export {
  IAuthenticationResponse,
  EmailTokens,
  IRemoveResponse,
  IResponse,
  ISimpleResponse,
  Page
} from './types/tokens/standard-tokens';
export { IAuthReq } from './types/tokens/i-auth-request';
export { ILoginToken } from './types/tokens/i-login-token';
export { IMessage } from './types/tokens/i-message';
export { IRegisterToken } from './types/tokens/i-register-token';
export { SocketTokens } from './types/tokens/i-socket-token';
export { IClient, IServer } from './types/config/properties/i-client';
export { IConfig } from './types/config/i-config';
export { IAdminUser } from './types/config/properties/i-admin';
export {
  AddCategoryInput,
  PaginatedCategoryResponse,
  Category,
  GetCategoriesArgs,
  UpdateCategoryInput
} from './graphql/models/category-type';

export { AddPostInput, GetPostsArgs, PaginatedPostsResponse, Post, UpdatePostInput } from './graphql/models/post-type';
export { AuthResponse, LoginInput, RegisterInput } from './graphql/models/auth-type';
export {
  AddCommentInput,
  Comment,
  GetCommentsArgs,
  PaginatedCommentsResponse,
  UpdateCommentInput
} from './graphql/models/comment-type';
export { Document } from './graphql/models/document-type';
export { Draft } from './graphql/models/draft-type';
export { AddElementInput, Element, UpdateElementInput } from './graphql/models/element-type';
export { File, GetFilesArgs, PaginatedFilesResponse, UpdateFileInput } from './graphql/models/file-type';
export { PaginatedTemplateResponse, Template } from './graphql/models/template-type';
export { AddUserInput, GetUsersArgs, PaginatedUserResponse, UpdateUserInput, User } from './graphql/models/user-type';
export {
  AddVolumeInput,
  GetVolumesArgs,
  PaginatedVolumeResponse,
  UpdateVolumeInput,
  Volume
} from './graphql/models/volume-type';

export {
  AuthLevel,
  CommentSortType,
  CommentVisibility,
  ElementType,
  FileSortType,
  PostSortType,
  PostVisibility,
  SortOrder,
  UserPrivilege,
  VolumeSortType,
  VolumeType
} from './core/enums';

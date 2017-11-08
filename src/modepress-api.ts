﻿import * as _Controller from './serializers/serializer';
import * as users from './core/user-manager';
import * as bucketManager from './core/bucket-manager';
import * as _Models from './models/model';
import * as _SchemaFactory from './models/schema-items/schema-item-factory';
import { isValidObjectID } from './utils/utils';
import * as permissions from './utils/permission-controllers';
import { AdminSerializer } from './serializers/admin-serializer';
import { BucketSerializer } from './serializers/bucket-serializer';
import { CommentsSerializer } from './serializers/comments-serializer';
import { CORSSerializer } from './serializers/cors-serializer';
import { EmailsSerializer } from './serializers/emails-serializer';
import { ErrorSerializer } from './serializers/error-serializer';
import { FileSerializer } from './serializers/file-serializer';
import { PageSerializer } from './serializers/page-serializer';
import { PostsSerializer } from './serializers/posts-serializer';
import { CategoriesSerializer } from './serializers/categories-serializer';
import { SessionSerializer } from './serializers/session-serializer';
import { StatsSerializer } from './serializers/stats-serializer';
import { UserSerializer } from './serializers/user-serializer';
import { AuthSerializer } from './serializers/auth-serializer';

export const Controller = _Controller.Serializer;
export const Model = _Models.Model;
export const SchemaFactory = _SchemaFactory;
export const UserManager = users.UserManager;
export const BucketManager = bucketManager.BucketManager;
export const isValidID = isValidObjectID;
export const authentication = permissions;
export const serializers = {
  /** Endpoints for administritive tasks */
  admin: AdminSerializer,
  /** Endpoints for authenticating users */
  auth: AuthSerializer,
  /** Endpoints for managing posts */
  posts: PostsSerializer,
  /** Endpoints for managing categories */
  categories: CategoriesSerializer,
  /** Endpoints for managing comments of posts */
  comments: CommentsSerializer,
  /** Endpoints for managing cross origin allowances */
  cors: CORSSerializer,
  /** TODO: This must be removed in favour of the admin controller */
  email: EmailsSerializer,
  /** Can be used to catch and return errors */
  error: ErrorSerializer,
  /** Endpoints for managing user files */
  file: FileSerializer,
  /** Endpoints for managing user buckets */
  bucket: BucketSerializer,
  /** Endpoints for managing page renders */
  renderer: PageSerializer,
  /** Endpoints for managing active sessions */
  session: SessionSerializer,
  /** Endpoints for managing user stats and allowances */
  stats: StatsSerializer,
  /** Endpoints for managing users */
  user: UserSerializer
}
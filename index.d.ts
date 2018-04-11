import * as _Controller from './lib/serializers/serializer';
import { UsersController } from './lib/controllers/users';
import { BucketsController } from './lib/controllers/buckets';
import { PostsController } from './lib/controllers/posts';
import * as _Models from './lib/models/model';
import * as _SchemaFactory from './lib/models/schema-items/schema-item-factory';
import { isValidObjectID } from './lib/utils/utils';
import * as permissions from './lib/utils/permission-controllers';
import { AdminSerializer } from './lib/serializers/admin-serializer';
import { BucketSerializer } from './lib/serializers/bucket-serializer';
import { CommentsSerializer } from './lib/serializers/comments-serializer';
import { CORSSerializer } from './lib/serializers/cors-serializer';
import { EmailsSerializer } from './lib/serializers/emails-serializer';
import { ErrorSerializer } from './lib/serializers/error-serializer';
import { FileSerializer } from './lib/serializers/file-serializer';
import { PageSerializer } from './lib/serializers/page-serializer';
import { PostsSerializer } from './lib/serializers/posts-serializer';
import { CategoriesSerializer } from './lib/serializers/categories-serializer';
import { SessionSerializer } from './lib/serializers/session-serializer';
import { StatsSerializer } from './lib/serializers/stats-serializer';
import { UserSerializer } from './lib/serializers/user-serializer';
import { AuthSerializer } from './lib/serializers/auth-serializer';
import { FilesController } from './lib/controllers/files';
import { StatsController } from './lib/controllers/stats';
import { CommentsController } from './lib/controllers/comments';
import { SessionsController } from './lib/controllers/sessions';
export declare const Controller: typeof _Controller.Serializer;
export declare const Model: typeof _Models.Model;
export declare const SchemaFactory: typeof _SchemaFactory;
export declare const isValidID: typeof isValidObjectID;
export declare const authentication: typeof permissions;
export declare const controllers: {
    users: UsersController;
    buckets: BucketsController;
    posts: PostsController;
    comments: CommentsController;
    files: FilesController;
    stats: StatsController;
    sessions: SessionsController;
};
export declare const serializers: {
    admin: typeof AdminSerializer;
    auth: typeof AuthSerializer;
    posts: typeof PostsSerializer;
    categories: typeof CategoriesSerializer;
    comments: typeof CommentsSerializer;
    cors: typeof CORSSerializer;
    email: typeof EmailsSerializer;
    error: typeof ErrorSerializer;
    file: typeof FileSerializer;
    bucket: typeof BucketSerializer;
    renderer: typeof PageSerializer;
    session: typeof SessionSerializer;
    stats: typeof StatsSerializer;
    user: typeof UserSerializer;
};
export { IBucketEntry } from './lib/types/models/i-bucket-entry';
export { ICategory } from './lib/types/models/i-category';
export { IComment } from './lib/types/models/i-comment';
export { IFileEntry } from './lib/types/models/i-file-entry';
export { IGMail, IMailer, IMailgun, IMailOptions } from './lib/types/models/i-mail';
export { IModelEntry } from './lib/types/models/i-model-entry';
export { IPost } from './lib/types/models/i-post';
export { IRender } from './lib/types/models/i-render';
export { ISessionEntry } from './lib/types/models/i-session-entry';
export { IStorageStats } from './lib/types/models/i-storage-stats';
export { IUserEntry } from './lib/types/models/i-user-entry';
export { IAuthenticationResponse, BucketTokens, EmailTokens, FileTokens, IRemoveResponse, IResponse, ISimpleResponse, IUploadBinaryResponse, IUploadResponse, IUploadTextResponse, Page, RenderTokens, SessionTokens, StatTokens } from './lib/types/tokens/standard-tokens';
export { IAuthReq } from './lib/types/tokens/i-auth-request';
export { ILoginToken } from './lib/types/tokens/i-login-token';
export { IMessage } from './lib/types/tokens/i-message';
export { IRegisterToken } from './lib/types/tokens/i-register-token';
export { SocketTokens } from './lib/types/tokens/i-socket-token';
export { IUploadToken } from './lib/types/tokens/i-upload-token';
export { IClient, IServer } from './lib/types/config/properties/i-client';
export { IConfig } from './lib/types/config/i-config';
export { IAdminUser } from './lib/types/config/properties/i-admin';

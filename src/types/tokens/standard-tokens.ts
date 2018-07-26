import { IUserEntry } from '../models/i-user-entry';
import { ISessionEntry } from '../models/i-session-entry';
import { IFileEntry } from '../models/i-file-entry';
import { IRender } from '../models/i-render';
import { IMessage } from './i-message';

/*
* The most basic response from the server. The base type of all responses.
 */
export interface IResponse {

}

export interface ISimpleResponse extends IResponse {
  message: string;
}

/*
* A response for when bulk items are deleted
*/
export interface IRemoveResponse extends IResponse {
  itemsRemoved: Array<{ id: string; error: boolean; errorMsg: string; }>;
}

/*
* A GET request that returns the status of a user's authentication
*/
export interface IAuthenticationResponse extends IResponse {
  message: string;
  authenticated: boolean;
  user?: IUserEntry<'client'> | null;
}

/*
* A GET request that returns an array of data items
*/
export interface Page<T> {
  count: number;
  data: Array<T>;
  index: number;
  limit: number;
}

export namespace SessionTokens {
  /** GET /sessions/ */
  export namespace GetAll { export type Body = void; export type Response = Page<ISessionEntry<'client'>>; }
  /** DELETE /sessions/:id */
  export namespace DeleteOne { export type Body = void; export type Response = void; }
}

export namespace RenderTokens {
  /** GET /renders/ */
  export namespace GetAll { export type Body = void; export type Response = Page<IRender<'client'>>; }
  /** DELETE /renders/:id */
  export namespace DeleteOne { export type Body = void; export type Response = void; }
  /** DELETE /renders/clear */
  export namespace DeleteAll { export type Body = void; export type Response = void; }
}

export namespace FileTokens {
  /** GET /files/users/:user/volumes/:volume */
  export namespace GetAll { export type Body = void; export type Response = Page<IFileEntry<'client'>>; }
  /** PUT /files/:file/rename-file */
  export namespace Put { export type Body = { name: string }; export type Response = Partial<IFileEntry<'client'>>; }
  /** DELETE /files/:file */
  export namespace DeleteAll { export type Body = void; export type Response = void; }
}

export namespace EmailTokens {
  /** POST /message-admin */
  export namespace Post { export type Body = IMessage; export type Response = boolean; }
}
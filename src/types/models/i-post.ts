import { IModelEntry } from './i-model-entry';
import { IUserEntry } from './i-user-entry';
import { ObjectID } from 'mongodb';
import { IFileEntry } from './i-file-entry';
import { IDocument } from './i-document';

/*
 * Describes the post model
 */
export interface IPost<T extends 'expanded' | 'client' | 'server'> extends IModelEntry<T> {
  author: T extends 'expanded' ? ( IUserEntry<T> | null ) : T extends 'client' ? IUserEntry<T> | string | null : ObjectID | null;
  title: string;
  slug: string;
  brief: string;
  public: boolean;
  featuredImage: T extends 'expanded' ? ( IFileEntry<T> | null ) : T extends 'client' ? IFileEntry<T> | string | null : ObjectID | null;
  document: T extends 'expanded' ? IDocument<T> : T extends 'client' ? IDocument<T> | string : ObjectID;
  categories: Array<string>;
  tags: Array<string>;
  createdOn: number;
  lastUpdated: number;
}

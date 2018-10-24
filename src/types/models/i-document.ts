import { ObjectID } from 'mongodb';
import { ITemplate } from './i-template';
import { IDraft } from './i-draft';

export interface IDocument<T extends 'server' | 'client'> {
  _id: T extends 'client' ? string : ObjectID;
  template: T extends 'client' ? ITemplate<T> | string : ObjectID;
  currentDraft: T extends 'client' ? IDraft<T> | null | string : ObjectID | null;
  publishedDraft: T extends 'client' ? IDraft<T> | string | null : ObjectID | null;
  lastUpdated: number;
  createdOn: number;
}
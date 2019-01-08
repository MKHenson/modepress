import { ObjectID } from 'mongodb';
import { ITemplate } from './i-template';
import { IDraft } from './i-draft';
import { IUserEntry } from './i-user-entry';
import { IDraftElement } from './i-draft-elements';

export interface IDocument<T extends 'expanded' | 'server' | 'client'> {
  _id: T extends 'client' | 'expanded' ? string : ObjectID;
  author: T extends 'expanded' ? IUserEntry<T> : T extends 'client' ? IUserEntry<T> | string | null : ObjectID | null;
  template: T extends 'expanded' ? ITemplate<T> : T extends 'client' ? ITemplate<T> | string : ObjectID;
  currentDraft: T extends 'expanded' ? IDraft<T> | null : T extends 'client' ? null | string : ObjectID | null;
  lastUpdated: number;
  createdOn: number;
  elementsOrder: string[];
  elements: IDraftElement<T>[];
  html: { [ zone: string ]: string };
}
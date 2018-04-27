import { IModelEntry } from './i-model-entry';

/*
 * Describes the category model
 */
export interface ICategory extends IModelEntry {
  title?: string;
  slug?: string;
  parent?: string | null;
  children?: ( string | ICategory )[];
  description?: string;
}

﻿import { Model } from './model';
import { foreignKey, textArray, date } from './schema-items/schema-item-factory';
import { IDraft } from '../types/models/i-draft';

/**
 * A model for describing drafts
 */
export class DraftsModel extends Model<IDraft<'client' | 'server'>> {
  constructor() {
    super( 'drafts' );

    this.schema.addItems( [
      new foreignKey( 'parent', 'documents', { keyCanBeNull: false } ),
      new foreignKey( 'template', 'templates', { keyCanBeNull: false } ),
      new textArray( 'elements', [] ),
      new date( 'lastModified', { useNow: true } ),
      new date( 'createdOn' ).setIndexable( true ),
      new date( 'lastUpdated', { useNow: true } ).setIndexable( true )
    ] );
  }
}
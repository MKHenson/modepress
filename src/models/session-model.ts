﻿import { Model } from './model';
import { text, num, json } from './schema-items/schema-item-factory';
import { ISessionEntry } from '../types/models/i-session-entry';

/**
 * A model for describing comments
 */
export class SessionModel extends Model<ISessionEntry<'client' | 'server'>> {
  constructor() {
    super( 'sessions' );
    this.schema.add( new text( 'sessionId', '' ) );
    this.schema.add( new json( 'data', {} ) );
    this.schema.add( new num( 'expiration', 0 ) );
  }
}
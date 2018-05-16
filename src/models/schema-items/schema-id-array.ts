﻿
import { ISchemaOptions } from '../../types/misc/i-schema-options';
import { IModelEntry } from '../../types/models/i-model-entry';
import { SchemaItem } from './schema-item';
import { SchemaForeignKey } from './schema-foreign-key';
import { ObjectID, UpdateWriteOpResult } from 'mongodb';
import { isValidObjectID } from '../../utils/utils';
import { IIdArrOptions } from '../../types/interfaces/i-schema-options';
import { Schema } from '../schema';
import Factory from '../../core/model-factory';

export type IdTypes = string | ObjectID | IModelEntry<'server' | 'client'>;

/**
 * An ID array scheme item for use in Models. Returns objects of the specified ids from the target collection.
 * Currently we only support Id lookups that exist in the same model - i.e. if the ids are of objects
 * in different models we cannot get the object values.
 */
export class SchemaIdArray extends SchemaItem<IdTypes[]> {
  public targetCollection: string;
  public minItems: number;
  public maxItems: number;
  public curLevel: number;
  private _targetDocs: Array<Schema<IModelEntry<'server'>>> | null;

  /**
   * Creates a new schema item that holds an array of id items
   * @param name The name of this item
   * @param val The array of ids for this schema item
   * @param targetCollection Specify the model name to which all the ids belong. If set the item can expand objects on retreival.
   */
  constructor( name: string, val: Array<string>, targetCollection: string, options?: IIdArrOptions ) {
    super( name, val );
    options = {
      minItems: 0,
      maxItems: 10000,
      ...options
    };

    this.maxItems = options.maxItems!;
    this.minItems = options.minItems!;
    this.targetCollection = targetCollection;
    this.curLevel = 1;
  }

  /**
   * Creates a clone of this item
   * @returns copy A sub class of the copy
   */
  public clone( copy?: SchemaIdArray ) {
    copy = copy === undefined ? new SchemaIdArray( this.name, <Array<string>>this.value, this.targetCollection ) : copy;
    super.clone( copy );
    copy.maxItems = this.maxItems;
    copy.minItems = this.minItems;
    copy.targetCollection = this.targetCollection;
    return copy;
  }

  /**
   * Checks the value stored to see if its correct in its current form
   * @returns Returns true if successful or an error message string if unsuccessful
   */
  public async validate(): Promise<boolean | Error> {
    const transformedValue = this.value;

    for ( let i = 0, l = transformedValue.length; i < l; i++ ) {
      if ( typeof this.value[ i ] === 'string' ) {
        if ( isValidObjectID( <string>this.value[ i ] ) )
          transformedValue[ i ] = new ObjectID( <string>this.value[ i ] );
        else if ( ( <string>this.value[ i ] ).trim() !== '' )
          throw new Error( `Please use a valid ID for '${this.name}'` );
        else
          throw new Error( `Please use a valid ID for '${this.name}'` );
      }
    }

    if ( transformedValue.length < this.minItems )
      throw new Error( `You must select at least ${this.minItems} item${( this.minItems === 1 ? '' : 's' )} for ${this.name}` );
    if ( transformedValue.length > this.maxItems )
      throw new Error( `You have selected too many items for ${this.name}, please only use up to ${this.maxItems}` );

    // If no collection - then return
    if ( !this.targetCollection )
      return true;

    if ( this.value.length === 0 )
      return true;

    // If they collection is not empty, then it must exist
    const model = Factory.get( this.targetCollection );

    if ( !model )
      throw new Error( `${this.name} references a foreign key '${this.targetCollection}' which doesn't seem to exist` );

    // We can assume the value is object id by this point
    const query = { $or: [] as IModelEntry<'server'>[] };
    const arr = this.value;

    for ( let i = 0, l = arr.length; i < l; i++ )
      query.$or.push( <IModelEntry<'server'>>{ _id: <ObjectID>arr[ i ] } );

    const result = await model.findMany( { selector: query } );

    if ( this.value.length !== result.length ) {
      for ( const id of this.value ) {
        if ( !result.find( category => ( new ObjectID( id as string ) ).equals( category.dbEntry._id ) ) )
          throw new Error( `Could not find resource in '${this.targetCollection}' with the id ${id}` );
      }
    }

    this._targetDocs = result;

    return true;
  }

  /**
   * Called once a model instance and its schema has been validated and inserted/updated into the database. Useful for
   * doing any post update/insert operations
   * @param collection The DB collection that the model was inserted into
   */
  public async postUpsert( schema: Schema<IModelEntry<'server' | 'client'>>, collection: string ): Promise<void> {
    if ( !this._targetDocs || this._targetDocs.length === 0 )
      return;

    // If they key is required then it must exist
    const model = Factory.get( this.targetCollection );
    const promises: Array<Promise<UpdateWriteOpResult>> = [];

    for ( let i = 0, l = this._targetDocs.length; i < l; i++ ) {
      let arrDeps = this._targetDocs[ i ].dbEntry._arrayDependencies || [];
      arrDeps.push( { _id: schema.dbEntry._id, collection: collection, propertyName: this.name } );
      promises.push( model.collection.updateOne( <IModelEntry<'server'>>{ _id: this._targetDocs[ i ].dbEntry._id }, {
        $set: <IModelEntry<'server'>>{ _arrayDependencies: arrDeps }
      } ) );
    }

    await Promise.all( promises );

    // Nullify the target doc cache
    this._targetDocs = null;
    return;
  }

  /**
   * Called after a model instance is deleted. Useful for any schema item cleanups.
   * @param instance The model instance that was deleted
   */
  public async postDelete( schema: Schema<IModelEntry<'server'>>, collection: string ): Promise<void> {
    if ( !this.targetCollection || this.targetCollection.length === 0 )
      return;

    // If they key is required then it must exist
    const model = Factory.get( this.targetCollection );
    if ( !model )
      return;

    if ( !this.value || this.value.length === 0 )
      return;

    // Get all the instances
    const query = { $or: [] as IModelEntry<'server'>[] };
    const arr = this.value;

    for ( let i = 0, l = arr.length; i < l; i++ )
      query.$or.push( <IModelEntry<'server'>>{ _id: <ObjectID>arr[ i ] } );

    const results = await model.findMany( { selector: query } );
    if ( !results || results.length === 0 )
      return;

    const pullQueries: Array<Promise<any>> = [];

    for ( let i = 0, l = results.length; i < l; i++ )
      pullQueries.push( model.collection.updateOne(
        <IModelEntry<'server'>>{ _id: results[ i ].dbEntry._id },
        { $pull: { _arrayDependencies: { _id: schema.dbEntry._id } } }
      ) );

    await Promise.all( pullQueries );
    return;
  }

  /**
   * Gets the value of this item
   * @param options [Optional] A set of options that can be passed to control how the data must be returned
   */
  public async getValue( options: ISchemaOptions ): Promise<Array<string | ObjectID | IModelEntry<'client'>>> {
    if ( options.expandForeignKeys && options.expandMaxDepth === undefined )
      throw new Error( 'You cannot set expandForeignKeys and not specify the expandMaxDepth' );

    if ( !options.expandForeignKeys )
      return this.value as IModelEntry<'client'>[];

    if ( options.expandSchemaBlacklist && options.expandSchemaBlacklist.indexOf( this.name ) !== -1 )
      return this.value as IModelEntry<'client'>[];

    if ( !this.targetCollection )
      return this.value as IModelEntry<'client'>[];

    const model = Factory.get( this.targetCollection );
    if ( !model )
      throw new Error( `${this.name} references a foreign key '${this.targetCollection}' which doesn't seem to exist` );

    // Make sure the current level is not beyond the max depth
    if ( options.expandMaxDepth !== undefined && options.expandMaxDepth !== -1 ) {
      if ( this.curLevel > options.expandMaxDepth )
        return this.value as IModelEntry<'client'>[];
    }

    if ( this.value.length === 0 )
      return this.value as IModelEntry<'client'>[];

    // Create the query for fetching the instances
    const query = { $or: [] as IModelEntry<'server'>[] };
    for ( let i = 0, l = this.value.length; i < l; i++ )
      query.$or.push( <IModelEntry<'server'>>{ _id: this.value[ i ] } );

    const instances = await model.findMany( { selector: query } );
    let instance: Schema<IModelEntry<'server'>>;
    const promises: Array<Promise<IModelEntry<'client'>>> = [];

    // Get the models items are increase their level - this ensures we dont go too deep
    for ( let i = 0, l = instances.length; i < l; i++ ) {
      instance = instances[ i ];
      const items = instance.getItems();
      const nextLevel = this.curLevel + 1;

      for ( const item of items )
        if ( item instanceof SchemaForeignKey || item instanceof SchemaIdArray )
          item.curLevel = nextLevel;

      promises.push( instance.downloadToken( options ) );
    }

    return await Promise.all( promises );
  }
}
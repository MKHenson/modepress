﻿import { ISchemaOptions } from '../types/misc/i-schema-options';
import { IModelEntry } from '../types/models/i-model-entry';
import { Collection, Db, ObjectID } from 'mongodb';
import { Schema } from './schema';
import { info } from '../utils/logger';

export interface ISearchOptions<T> {
  selector?: any;
  sort?: { [ key in keyof Partial<T> ]: number } | null;
  index?: number;
  limit?: number;
  projection?: { [ name: string ]: number }
}

/**
 * Models map data in the application/client to data in the database
 */
export abstract class Model<T extends IModelEntry<'client' | 'server'>> {
  public collection: Collection<T>;
  public schema: Schema<T>;
  private _collectionName: string;

  /**
	 * Creates an instance of a Model
	 * @param collection The collection name associated with this model
	 */
  constructor( collection: string ) {
    this._collectionName = collection;
    this.schema = new Schema();
  }

  /**
	 * Gets the name of the collection associated with this model
	 */
  get collectionName(): string { return this._collectionName; }

  /**
	 * Initializes the model by setting up the database collections
	 */
  async initialize( collection: Collection, db: Db ): Promise<Model<T>> {
    info( `Successfully created model '${this._collectionName}'` );
    this.collection = collection;

    return this;
  }

  /**
   * Gets the number of DB entries based on the selector
   * @param selector The mongodb selector
   */
  count( selector: any ) {
    return this.collection.count( selector );
  }

  /**
	 * Gets an array of schemas based on the query options
	 */
  async findMany<Y extends IModelEntry<'server'>>( query: ISearchOptions<T> = {} ) {
    const collection = this.collection;

    // Attempt to save the data to mongo collection
    let cursor = collection.find( query.selector || {} );

    if ( query.index !== undefined )
      cursor = cursor.skip( query.index );
    if ( query.limit !== undefined && query.limit !== -1 )
      cursor = cursor.limit( query.limit );
    if ( query.projection !== undefined )
      cursor = cursor.project( query.projection );
    if ( query.sort )
      cursor = cursor.sort( query.sort );

    const result = await cursor.toArray() as IModelEntry<'server'>[];

    // Create the instance array
    const schemas: Schema<IModelEntry<'server'>>[] = [];
    let schema: Schema<IModelEntry<'server'>>;

    // For each data entry, create a new instance
    for ( let i = 0, l = result.length; i < l; i++ ) {
      schema = this.schema.clone() as Schema<IModelEntry<'server'>>;
      schema.setServer( result[ i ], true );
      schemas.push( schema as Schema<IModelEntry<'server'>> );
    }

    // Complete
    return schemas as Schema<Y>[];
  }

  /**
   * Gets a single model schema
   * @param selector The mongodb selector object
   */
  async findOne<Y extends IModelEntry<'server'>>( selector: any ): Promise<Schema<Y> | null> {
    const schemas = await this.findMany( { selector: selector, limit: 1 } );
    if ( !schemas || schemas.length === 0 )
      return null;

    return schemas[ 0 ] as Schema<Y>;
  }

  /**
   * Downloads a client json of the model
   * @param selector The mongodb selector object
   */
  async downloadOne<Y extends IModelEntry<'client'>>( selector: any, options: ISchemaOptions ) {
    const schema = await this.findOne( selector );
    if ( !schema )
      return null;

    return schema.downloadToken<Y>( options );
  }

  /**
   * Downloads multiple client jsons based on a query and download options
   */
  async downloadMany<Y extends IModelEntry<'client'>>( query: ISearchOptions<T> = {}, options: ISchemaOptions ) {
    const schemas = await this.findMany( query );
    const jsons: Promise<IModelEntry<'client'>>[] = [];
    for ( let i = 0, l = schemas.length; i < l; i++ )
      jsons.push( schemas[ i ].downloadToken<IModelEntry<'client'>>( options ) );

    const sanitizedData = await Promise.all( jsons ) as Y[];
    return sanitizedData;
  }

  /**
   * Deletes a instance and all its dependencies are updated or deleted accordingly
   */
  private async deleteInstance( schema: Schema<IModelEntry<'server'>> ) {
    const deleteResult = await this.collection.deleteMany( <IModelEntry<'server'>>{ _id: schema.dbEntry._id } );
    return deleteResult.deletedCount!;
  }

  /**
	 * Deletes a number of instances based on the selector. The promise reports how many items were deleted
	 */
  async deleteInstances( selector: any ): Promise<number> {
    const schemas = await this.findMany( { selector: selector } );

    if ( !schemas || schemas.length === 0 )
      return 0;

    const promises: Array<Promise<any>> = [];

    for ( let i = 0, l = schemas.length; i < l; i++ ) {
      promises.push( this.deleteInstance( schemas[ i ] ) );
    };

    await Promise.all( promises );

    return Promise.resolve( schemas.length );
  }

  /**
   * Updates an instance with new data. The update process will validate the new data and check that
   * unique fields are still being respected.
   * @param selector The selector to determine which model to update
   * @param data The data to update the model with
   */
  async update<Y extends IModelEntry<'client'>>( selector: any, data: Partial<Y>, options: ISchemaOptions = { verbose: true, expandForeignKeys: false } ) {

    const schema = await this.findOne( selector );

    if ( !schema )
      throw new Error( `Resource does not exist` );

    const id = schema.dbEntry._id;

    // If we have data, then set the variables
    if ( data )
      ( schema as Schema<T> ).setClient( data, false );

    // Make sure the new updates are valid
    await schema.validate( false );

    // Make sure any unique fields are still being respected
    const unique = await this.checkUniqueness( schema, id );

    if ( !unique )
      throw new Error( `'${this.schema.uniqueFieldNames()}' must be unique` );

    // Transform the schema into a JSON ready format
    const json = schema.uploadToken();
    const collection = this.collection;
    await collection.updateOne( { _id: typeof ( schema.dbEntry._id ) === 'string' ? new ObjectID( schema.dbEntry._id ) : schema.dbEntry._id }, { $set: json } );
    return schema.downloadToken<Y>( options );
  }

  /**
   * Checks if the schema item being ammended is unique
   */
  async checkUniqueness( schema: Schema<IModelEntry<'server'>>, id?: ObjectID ): Promise<boolean> {
    const items = schema.getItems();
    let hasUniqueField: boolean = false;
    const searchToken: any = { $or: [] as any[] };

    if ( id )
      searchToken[ '_id' ] = { $ne: id };

    for ( let i = 0, l = items.length; i < l; i++ ) {
      if ( items[ i ].getUnique() ) {
        hasUniqueField = true;
        const searchField: any = {};
        searchField[ items[ i ].name ] = items[ i ].getClientValue() || items[ i ].getDbValue();
        searchToken.$or.push( searchField );
      }
      else if ( items[ i ].getUniqueIndexer() )
        searchToken[ items[ i ].name ] = items[ i ].getClientValue() || items[ i ].getDbValue();
    }

    if ( !hasUniqueField )
      return true;
    else {
      const result = await this.collection.count( searchToken );
      if ( result === 0 )
        return true;
      else
        return false;
    }
  }


  /**
	 * Creates a new model instance. The default schema is saved in the database and an instance is returned on success.
	 * @param data [Optional] You can pass a data object that will attempt to set the instance's schema variables
	 * by parsing the data object and setting each schema item's value by the name/value in the data object
	 */
  async createInstance<Y extends Partial<IModelEntry<'client'>>>( data?: Partial<Y> ) {
    const schema = this.schema.clone();

    // If we have data, then set the variables
    if ( data )
      schema.setClient( data, true );

    const unique = await this.checkUniqueness( schema as Schema<IModelEntry<'server'>> );

    if ( !unique )
      throw new Error( `'${this.schema.uniqueFieldNames()}' must be unique` );

    // Now try to create a new instance
    const schemas = await this.insert( [ schema as Schema<IModelEntry<'server'>> ] );

    // All ok
    return schemas[ 0 ] as Schema<T>;
  }

  /**
	 * Attempts to insert an array of instances of this model into the database.
	 * @param instances An array of instances to save
	 */
  private async insert( instances: Schema<IModelEntry<'server'>>[] ) {
    const documents: Array<any> = [];
    const promises: Array<Promise<Schema<IModelEntry<'server'>>>> = [];

    // Make sure the parameters are valid
    for ( let i = 0, l = instances.length; i < l; i++ )
      promises.push( instances[ i ].validate( true ) );

    const schemas = await Promise.all<Schema<IModelEntry<'server'>>>( promises );

    // Transform the schema into a JSON ready format
    for ( let i = 0, l = schemas.length; i < l; i++ ) {
      const json = schemas[ i ].uploadToken();
      documents.push( json );
    }

    // Attempt to save the data to mongo collection
    const insertResult = await this.collection.insertMany( documents );

    // Assign the ID's
    for ( let i = 0, l = insertResult.ops.length; i < l; i++ )
      schemas[ i ].setServer( insertResult.ops[ i ], true );

    return instances;
  }
}
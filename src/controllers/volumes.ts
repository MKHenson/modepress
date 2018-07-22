﻿import { IConfig } from '../types/config/i-config';
import { Page } from '../types/tokens/standard-tokens';
import { IVolume } from '../types/models/i-volume-entry';
import { IStorageStats } from '../types/models/i-storage-stats';
import { Db, ObjectID } from 'mongodb';
import { CommsController } from '../socket-api/comms-controller';
import { ClientInstructionType } from '../socket-api/socket-event-types';
import { ClientInstruction } from '../socket-api/client-instruction';
import { generateRandString, isValidObjectID } from '../utils/utils';
import Controller from './controller';
import { FilesController } from './files';
import ControllerFactory from '../core/controller-factory';
import { StatsController } from './stats';
import { VolumeModel } from '../models/volume-model';
import ModelFactory from '../core/model-factory';
import { StorageStatsModel } from '../models/storage-stats-model';
import RemoteFactory from '../core/remotes/remote-factory';

export type GetManyOptions = {
  user: string;
  searchTerm: RegExp;
  index: number;
  limit: number;
};

export type GetOptions = {
  id: string;
  user: string;
  identifier: string;
  name: string;
};

export type DeleteOptions = {
  user: string;
  _id: string | ObjectID;
};

/**
 * Class responsible for managing volumes and uploads
 */
export class VolumesController extends Controller {
  private _volumes: VolumeModel;
  private _stats: StorageStatsModel;
  private _filesController: FilesController;
  private _statsController: StatsController;

  constructor( config: IConfig ) {
    super( config );
  }

  /**
   * Initializes the controller
   * @param db The mongo db
   */
  async initialize( db: Db ) {

    this._volumes = ModelFactory.get( 'volumes' );
    this._stats = ModelFactory.get( 'storage' );
    this._filesController = ControllerFactory.get( 'files' );
    this._statsController = ControllerFactory.get( 'stats' );
    return this;
  }

  /**
   * Fetches all volume entries from the database
   * @param options Options for defining which volumes to return
   */
  async getMany( options: Partial<GetManyOptions> = { index: 0, limit: 10 } ) {
    const volumeModel = this._volumes;
    const search: Partial<IVolume<'server'>> = {};

    if ( options.user )
      search.user = options.user;

    if ( options.searchTerm )
      search.name = options.searchTerm as any;

    let limit = options.limit !== undefined ? options.limit : 10;
    let index = options.index !== undefined ? options.index : 0;

    // Save the new entry into the database
    const count = await volumeModel.count( search );
    const schemas = await volumeModel.findMany<IVolume<'server'>>( { selector: search, index, limit } );
    const volumes = await Promise.all( schemas.map( s => s.downloadToken<IVolume<'client'>>( { verbose: true } ) ) );

    const toRet: Page<IVolume<'client'>> = {
      limit: limit,
      count: count,
      index: index,
      data: volumes
    };
    return toRet;
  }

  /**
   * Gets a volume by its name or ID
   */
  async get( options: Partial<GetOptions> = {} ) {
    const volumeModel = this._volumes;
    const searchQuery: Partial<IVolume<'server'>> = {};

    if ( options.user )
      searchQuery.user = options.user;

    if ( options.name )
      searchQuery.name = options.name;

    if ( options.identifier )
      searchQuery.identifier = options.identifier;

    if ( options.id )
      searchQuery._id = new ObjectID( options.id );

    const result = await volumeModel.findOne<IVolume<'server'>>( searchQuery );

    if ( !result )
      return null;
    else {
      const volume = await result.downloadToken<IVolume<'client'>>( { verbose: true } );
      return volume;
    }
  }

  /**
   * Updates a volume resource
   * @param id The id of the volume to edit
   * @param token The edit token
   */
  async update( id: string, token: IVolume<'client'> ) {

    if ( !isValidObjectID( id ) )
      throw new Error( `Please use a valid object id` );

    const updatedVolume = await this._volumes.update<IVolume<'client'>>( { _id: new ObjectID( id ) }, token );
    return updatedVolume;
  }

  /**
   * Attempts to remove all data associated with a user
   * @param user The user we are removing
   */
  async removeUser( user: string ) {
    await this.remove( { user: user } );
    await this._statsController.remove( user );
    await this._filesController.removeFiles( { user: user } );
    return;
  }

  /**
   * Attempts to create a new user volume by first creating the storage on the cloud and then updating the internal DB
   * @param name The name of the volume
   * @param user The user associated with this volume
   */
  async create( name: string, user: string ) {
    const identifier = `webinate-volume-${generateRandString( 8 ).toLowerCase()}`;
    const volumeModel = this._volumes;
    const statsModel = this._stats;

    // Get the entry
    let volume: Partial<IVolume<'client'>> | null = await this.get( { name: name, user: user } );

    // Make sure no volume already exists with that name
    if ( volume )
      throw new Error( `A volume with the name '${name}' has already been registered` );

    // Create the new volume
    volume = {
      name: name,
      identifier: identifier,
      created: Date.now(),
      user: user,
      memoryUsed: 0
    }

    // Save the new entry into the database
    const schema = await volumeModel.createInstance( volume );

    // Attempt to create a new Google volume
    await RemoteFactory.get( schema.dbEntry.type ).createVolume( schema.dbEntry );

    const curStats = await statsModel.findOne<IStorageStats<'server'>>( { user: user } );

    if ( !curStats )
      throw new Error( `No storage stats found for uer` );

    // Increments the API calls
    await statsModel.update<IStorageStats<'client'>>( { user: user } as IStorageStats<'server'>, { apiCallsUsed: curStats.dbEntry.apiCallsUsed + 1 } as IStorageStats<'client'> );

    // Send volume added events to sockets
    const token = { type: ClientInstructionType[ ClientInstructionType.VolumeUploaded ], volume: volume!, username: user };
    await CommsController.singleton.processClientInstruction( new ClientInstruction( token, null, user ) );
    return schema.downloadToken<IVolume<'client'>>( { verbose: true } );
  }

  /**
   * Attempts to remove volumes of the given search result. This will also update the file and stats collection.
   * @param searchQuery A valid mongodb search query
   * @returns An array of ID's of the volumes removed
   */
  async remove( options: Partial<DeleteOptions> ) {
    const volumesModel = this._volumes;
    const toRemove: string[] = [];
    const searchQuery: Partial<IVolume<'server'>> = {};

    if ( options._id ) {
      if ( typeof options._id === 'string' ) {
        if ( !isValidObjectID( options._id ) )
          throw new Error( 'Please use a valid object id' );

        searchQuery._id = new ObjectID( options._id );
      }
      else
        searchQuery._id = options._id;
    }

    if ( options.user )
      searchQuery.user = options.user;

    // Get all the volumes
    const schemas = await volumesModel.findMany<IVolume<'server'>>( { selector: searchQuery, limit: -1 } );

    if ( options._id && schemas.length === 0 )
      throw new Error( 'A volume with that ID does not exist' );

    // Now delete each one
    const promises: Promise<IVolume<'server'>>[] = []
    for ( let i = 0, l = schemas.length; i < l; i++ )
      promises.push( this.deleteVolume( schemas[ i ].dbEntry ) as Promise<IVolume<'server'>> );

    await Promise.all( promises );
    return toRemove;
  }

  /**
   * Deletes the volume from storage and updates the databases
   */
  private async deleteVolume( volume: IVolume<'server' | 'client'> ) {
    const volumesModel = this._volumes;
    const statsModel = this._stats;

    try {
      // First remove all volume files
      await this._filesController.removeFiles( { volumeId: volume._id } );
    } catch ( err ) {
      throw new Error( `Could not remove the volume: '${err.toString()}'` );
    }

    await RemoteFactory.get( volume.type ).removeVolume( volume );

    const curStats = await statsModel.findOne<IStorageStats<'server'>>( { user: volume.user } );
    if ( !curStats )
      throw new Error( `No storage stats found for uer` );

    // Remove the volume entry
    await volumesModel.deleteInstances( { _id: volume._id } as IVolume<'server'> );
    await statsModel.update<IStorageStats<'client'>>( { user: volume.user } as IStorageStats<'server'>, { apiCallsUsed: curStats.dbEntry.apiCallsUsed + 1 } as IStorageStats<'client'> );

    // Send events to sockets
    const token = { type: ClientInstructionType[ ClientInstructionType.VolumeRemoved ], volume: volume, username: volume.user! };
    await CommsController.singleton.processClientInstruction( new ClientInstruction( token, null, volume.user ) );

    return volume;
  }

  /**
   * Checks to see the user's api limit and make sure they can make calls
   * @param user The username
   */
  async withinAPILimit( user: string ) {
    const statsModel = this._stats;
    const result = await statsModel.findOne<IStorageStats<'server'>>( { user: user } as IStorageStats<'server'> );

    if ( !result )
      throw new Error( `Could not find the user ${user}` );

    else if ( result.dbEntry.apiCallsUsed + 1 < result.dbEntry.apiCallsAllocated )
      return true;
    else
      return false;
  }
}
﻿'use strict';
import { IAuthReq, FileTokens } from 'modepress';
import express = require( 'express' );
import bodyParser = require( 'body-parser' );
import { ownerRights, requireUser } from '../utils/permission-controllers';
import { Serializer } from './serializer'
import ControllerFactory from '../core/controller-factory';
import * as compression from 'compression';
import { j200 } from '../utils/response-decorators';
import { IFileOptions } from 'modepress';
import * as mongodb from 'mongodb';
import Factory from '../core/model-factory';
import { FilesController } from '../controllers/files';

/**
 * Main class to use for managing users
 */
export class FileSerializer extends Serializer {
  private _options: IFileOptions;
  private _files: FilesController;

  /**
	 * Creates an instance of the user manager
	 */
  constructor( options: IFileOptions ) {
    super( [ Factory.get( 'buckets' ) ] );
    this._options = options;
  }

  /**
   * Called to initialize this controller and its related database objects
   */
  async initialize( e: express.Express, db: mongodb.Db ) {
    this._files = ControllerFactory.get( 'files' );

    // Setup the rest calls
    const router = express.Router();
    router.use( compression() );
    router.use( bodyParser.urlencoded( { 'extended': true } ) );
    router.use( bodyParser.json() );
    router.use( bodyParser.json( { type: 'application/vnd.api+json' } ) );

    router.get( '/users/:user/buckets/:bucket', <any>[ ownerRights, this.getFiles.bind( this ) ] );
    router.delete( '/:file', <any>[ requireUser, this.remove.bind( this ) ] );
    router.put( '/:file', <any>[ requireUser, this.update.bind( this ) ] );

    // Register the path
    e.use( ( this._options.rootPath || '' ) + `/files`, router );

    await super.initialize( e, db );
    return this;
  }

  /**
   * Removes a file specified in the URL
   */
  @j200( 204 )
  private async remove( req: IAuthReq, res: express.Response ) {
    await this._files.removeFiles( { fileId: req.params.file, user: req._user!.username } );
  }

  /**
   * Renames a file
   */
  @j200()
  private async update( req: IAuthReq, res: express.Response ) {
    const file = req.body as FileTokens.Put.Body;
    const updatedFile: FileTokens.Put.Response = await this._files.update( req.params.file, file );
    return updatedFile;
  }


  /**
   * Fetches all file entries from the database. Optionally specifying the bucket to fetch from.
   */
  @j200()
  private async getFiles( req: IAuthReq, res: express.Response ) {
    let index: number | undefined = parseInt( req.query.index );
    let limit: number | undefined = parseInt( req.query.limit );
    index = isNaN( index ) ? undefined : index;
    limit = isNaN( limit ) ? undefined : limit;

    if ( !req.params.bucket || req.params.bucket.trim() === '' )
      throw new Error( 'Please specify a valid bucket name' );

    const page = await this._files.getFiles( {
      bucketId: req.params.bucket,
      index: index,
      limit: limit,
      user: req.params.user,
      searchTerm: req.query.search ? new RegExp( req.query.search, 'i' ) : undefined
    } );

    const resp: FileTokens.GetAll.Response = page;
    return resp;
  }
}
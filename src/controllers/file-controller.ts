﻿'use strict';
import { IAuthReq, IBucketEntry, FileTokens } from 'modepress';
import express = require( 'express' );
import bodyParser = require( 'body-parser' );
import { ownerRights, requireUser } from '../utils/permission-controllers';
import { Controller } from './controller'
import { BucketManager } from '../core/bucket-manager';
import * as compression from 'compression';
import { okJson, errJson } from '../utils/serializers';
import { Model } from '../models/model';
import { BucketModel } from '../models/bucket-model';
import { IFileOptions } from 'modepress';
import * as mongodb from 'mongodb';

/**
 * Main class to use for managing users
 */
export class FileController extends Controller {
  private _allowedFileTypes: Array<string>;
  private _cacheLifetime: number;
  private _options: IFileOptions;

  /**
	 * Creates an instance of the user manager
	 */
  constructor( options: IFileOptions ) {
    super( [ Model.registerModel( BucketModel ) ] );
    this._options = options;
  }

  /**
   * Called to initialize this controller and its related database objects
   */
  async initialize( e: express.Express, db: mongodb.Db ): Promise<Controller> {

    this._cacheLifetime = this._options.cacheLifetime;
    this._allowedFileTypes = [ 'image/bmp', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/tiff', 'text/plain', 'text/json', 'application/octet-stream' ];

    // Setup the rest calls
    const router = express.Router();
    router.use( compression() );
    router.use( bodyParser.urlencoded( { 'extended': true } ) );
    router.use( bodyParser.json() );
    router.use( bodyParser.json( { type: 'application/vnd.api+json' } ) );

    router.get( '/users/:user/buckets/:bucket', <any>[ ownerRights, this.getFiles.bind( this ) ] );
    router.delete( '/:files', <any>[ requireUser, this.removeFiles.bind( this ) ] );
    router.put( '/:file/rename-file', <any>[ requireUser, this.renameFile.bind( this ) ] );

    // Register the path
    e.use( ( this._options.rootPath || '' ) + `/files`, router );

    await super.initialize( e, db );
    return this;
  }

  /**
   * Removes files specified in the URL
   */
  private async removeFiles( req: IAuthReq, res: express.Response ) {
    try {
      const manager = BucketManager.get;
      let files: Array<string>;

      if ( !req.params.files || req.params.files.trim() === '' )
        throw new Error( 'Please specify the files to remove' );

      files = req.params.files.split( ',' );
      const filesRemoved = await manager.removeFilesByIdentifiers( files, req._user!.username );

      okJson<FileTokens.DeleteAll.Response>( {
        message: `Removed [${filesRemoved.length}] files`,
        data: filesRemoved,
        count: filesRemoved.length
      }, res );

    } catch ( err ) {
      return errJson( err, res );
    };
  }

  /**
   * Renames a file
   */
  private async renameFile( req: IAuthReq, res: express.Response ) {
    try {
      const manager = BucketManager.get;

      if ( !req.params.file || req.params.file.trim() === '' )
        throw new Error( 'Please specify the file to rename' );
      if ( !req.body || !req.body.name || req.body.name.trim() === '' )
        throw new Error( 'Please specify the new name of the file' );

      const fileEntry = await manager.getFile( req.params.file, req._user!.username );

      if ( !fileEntry )
        throw new Error( `Could not find the file '${req.params.file}'` );

      const file = req.body as FileTokens.Put.Body;
      await manager.renameFile( fileEntry, file.name );
      okJson<FileTokens.Put.Response>( { message: `Renamed file to '${req.body.name}'` }, res );

    } catch ( err ) {
      return errJson( err, res );
    };
  }


  /**
   * Fetches all file entries from the database. Optionally specifying the bucket to fetch from.
   */
  private async getFiles( req: IAuthReq, res: express.Response ) {
    const manager = BucketManager.get;
    const index = parseInt( req.query.index );
    const limit = parseInt( req.query.limit );
    let bucketEntry: IBucketEntry | null;
    let searchTerm: RegExp | undefined;

    try {
      if ( !req.params.bucket || req.params.bucket.trim() === '' )
        throw new Error( 'Please specify a valid bucket name' );

      // Check for keywords
      if ( req.query.search )
        searchTerm = new RegExp( req.query.search, 'i' );

      bucketEntry = await manager.getIBucket( req.params.bucket, req.params.user );

      if ( !bucketEntry )
        throw new Error( `Could not find the bucket '${req.params.bucket}'` );

      const count = await manager.numFiles( { bucketId: bucketEntry.identifier } );
      const files = await manager.getFilesByBucket( bucketEntry, index, limit, searchTerm );

      return okJson<FileTokens.GetAll.Response>( {
        message: `Found [${count}] files`,
        data: files,
        count: count
      }, res );

    } catch ( err ) {
      return errJson( err, res );
    };
  }
}
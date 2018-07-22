﻿import { IAuthReq } from '../types/tokens/i-auth-request';
import express = require( 'express' );
import bodyParser = require( 'body-parser' );
import * as mongodb from 'mongodb';
import ControllerFactory from '../core/controller-factory';
import { UsersController } from '../controllers/users';
import { VolumesController } from '../controllers/volumes';
import { ownerRights, requireUser } from '../utils/permission-controllers';
import { Serializer } from './serializer';
import * as compression from 'compression';
import { j200 } from '../utils/response-decorators';
import { IBaseControler } from '../types/misc/i-base-controller';
import Factory from '../core/model-factory';
import { IVolume } from '../types/models/i-volume-entry';

/**
 * Main class to use for managing users
 */
export class VolumeSerializer extends Serializer {

  private _options: IBaseControler;
  private _userController: UsersController;
  private _volumeController: VolumesController;

  /**
	 * Creates an instance of the user manager
	 */
  constructor( options: IBaseControler ) {
    super( [ Factory.get( 'volumes' ) ] );
    this._options = options;
  }

  /**
 * Called to initialize this controller and its related database objects
 */
  async initialize( e: express.Express, db: mongodb.Db ) {

    this._userController = ControllerFactory.get( 'users' );
    this._volumeController = ControllerFactory.get( 'volumes' );

    // Setup the rest calls
    const router = express.Router();
    router.use( compression() );
    router.use( bodyParser.urlencoded( { 'extended': true } ) );
    router.use( bodyParser.json() );
    router.use( bodyParser.json( { type: 'application/vnd.api+json' } ) );

    router.get( '/user/:user', <any>[ ownerRights, this.getVolumes.bind( this ) ] );
    router.delete( '/:id', <any>[ requireUser, this.removeVolumes.bind( this ) ] );
    router.post( '/user/:user/:name', <any>[ ownerRights, this.createVolume.bind( this ) ] );

    // Register the path
    e.use( ( this._options.rootPath || '' ) + `/volumes`, router );

    await super.initialize( e, db );
    return this;
  }

  /**
   * Removes volumes specified in the URL
   */
  @j200( 204 )
  private async removeVolumes( req: IAuthReq, res: express.Response ) {
    await this._volumeController.remove( { _id: req.params.id as string } );
    return;
  }

  /**
   * Fetches all volume entries from the database
   */
  @j200()
  private async getVolumes( req: IAuthReq, res: express.Response ) {
    const user = req.params.user;
    const manager = this._volumeController;
    let searchTerm: RegExp | undefined;

    // Check for keywords
    if ( req.query.search )
      searchTerm = new RegExp( req.query.search, 'i' );

    const toRet = await manager.getMany( {
      user: user,
      searchTerm: searchTerm,
      index: 0,
      limit: 100
    } );

    return toRet;
  }

  private alphaNumericDashSpace( str: string ): boolean {
    if ( !str.match( /^[0-9A-Z _\-]+$/i ) )
      return false;
    else
      return true;
  }

  /**
   * Creates a new user volume based on the target provided
   */
  @j200()
  private async createVolume( req: IAuthReq, res: express.Response ) {
    const manager = this._volumeController;
    const username: string = req.params.user;
    const name: string = req.params.name;

    if ( !username || username.trim() === '' )
      throw new Error( 'Please specify a valid username' );
    if ( !name || name.trim() === '' )
      throw new Error( 'Please specify a valid name' );
    if ( !this.alphaNumericDashSpace( name ) )
      throw new Error( 'Please only use safe characters' );

    const user = await this._userController.getUser( username );
    if ( !user )
      throw new Error( `Could not find a user with the name '${username}'` );

    const inLimits = await manager.withinAPILimit( username );
    if ( !inLimits )
      throw new Error( `You have run out of API calls, please contact one of our sales team or upgrade your account.` );

    const entry = await manager.create( name, username ) as IVolume<'client'>;
    return entry;
  }
}
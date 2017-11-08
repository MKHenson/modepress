﻿'use strict';
import { ISimpleResponse } from 'modepress';
import express = require( 'express' );
import bodyParser = require( 'body-parser' );
import { UserManager } from '../core/user-manager';
import { Serializer } from './serializer'
import { j200 } from '../utils/response-decorators';
import * as compression from 'compression';
import { IBaseControler } from 'modepress';
import * as mongodb from 'mongodb';
import Factory from '../core/model-factory';

/**
 * Main class to use for managing users
 */
export class AdminSerializer extends Serializer {
  private _options: IBaseControler;

  constructor( options: IBaseControler ) {
    super( [ Factory.get( 'users' ) ] );
    this._options = options;
  }

  /**
 * Called to initialize this controller and its related database objects
 */
  async initialize( e: express.Express, db: mongodb.Db ) {

    // Setup the rest calls
    const router = express.Router();
    router.use( compression() );
    router.use( bodyParser.urlencoded( { 'extended': true } ) );
    router.use( bodyParser.json() );
    router.use( bodyParser.json( { type: 'application/vnd.api+json' } ) );

    router.post( '/message-webmaster', this.messageWebmaster.bind( this ) );

    // Register the path
    e.use( ( this._options.rootPath || '' ) + '/admin', router );

    await super.initialize( e, db );
    return this;
  }

  /**
 * Attempts to send the webmaster an email message
 */
  @j200()
  private async messageWebmaster( req: express.Request, res: express.Response ) {
    const token: any = req.body;

    if ( !token.message )
      throw new Error( 'Please specify a message to send' );

    await UserManager.get.sendAdminEmail( token.message, token.name, token.from );
    const response: ISimpleResponse = { message: 'Your message has been sent to the support team' };
    return response;
  }
}
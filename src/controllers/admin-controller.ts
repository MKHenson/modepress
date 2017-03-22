﻿'use strict';

import express = require( 'express' );
import bodyParser = require( 'body-parser' );
import * as def from 'webinate-users';
import { UserManager } from '../users';
import { Controller } from './controller'
import { okJson, errJson } from '../serializers';
import * as compression from 'compression';
import { Model } from '../models/model';
import { UsersModel } from '../models/users-model';

/**
 * Main class to use for managing users
 */
export class AdminController extends Controller {
    private _config: Modepress.IConfig;

    constructor( e: express.Express, config: Modepress.IConfig ) {
        super([ Model.registerModel( UsersModel ) ]);

        this._config = config;

        // Setup the rest calls
        const router = express.Router();
        router.use( compression() );
        router.use( bodyParser.urlencoded( { 'extended': true } ) );
        router.use( bodyParser.json() );
        router.use( bodyParser.json( { type: 'application/vnd.api+json' } ) );

        router.post( '/message-webmaster', this.messageWebmaster.bind( this ) );

        // Register the path
        e.use( '/admin', router );
    }

    /**
	 * Attempts to send the webmaster an email message
	 */
    private async messageWebmaster( req: express.Request, res: express.Response ) {
        try {
            const token: any = req.body;

            if ( !token.message )
                throw new Error( 'Please specify a message to send' );

            await UserManager.get.sendAdminEmail( token.message, token.name, token.from );
            okJson<def.IResponse>( { error: false, message: 'Your message has been sent to the support team' }, res );

        } catch ( err ) {
            return errJson( err, res );
        };
    }
}
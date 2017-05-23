﻿import { IConfig } from '../definitions/custom/config/i-config';
import { IServer } from '../definitions/custom/config/i-server';
import { IMessage } from '../definitions/custom/tokens/i-message';

import * as express from 'express';
import * as controllerModule from './controller';
import * as bodyParser from 'body-parser';
import { UserManager } from '../core/users'
import { errJson } from '../utils/serializers';

export default class EmailsController extends controllerModule.Controller {
	/**
	 * Creates a new instance of the email controller
	 * @param server The server configuration options
     * @param config The configuration options
     * @param e The express instance of this server
	 */
    constructor( server: IServer, config: IConfig, e: express.Express ) {
        super( null );

        const router = express.Router();
        router.use( bodyParser.urlencoded( { 'extended': true } ) );
        router.use( bodyParser.json() );
        router.use( bodyParser.json( { type: 'application/vnd.api+json' } ) );

        // Filter the post requests
        router.post( '/', this.onPost.bind( this ) );

        // Register the path
        e.use( '/api/message-admin', router );
    }

	/**
	 * Called whenever a post request is caught by this controller
	 */
    protected onPost( req: express.Request, res: express.Response ): any {
        // Set the content type
        res.setHeader( 'Content-Type', 'application/json' );

        const message: string = [ `Hello admin,`,
            `We have received a message from ${( <IMessage>req.body ).name}:`,
            `${( <IMessage>req.body ).message}`,
            ``,
            `Email: ${( <IMessage>req.body ).email}`,
            `Phone: ${( <IMessage>req.body ).phone}`,
            `Website: ${( <IMessage>req.body ).website}` ].join( '\r\n' );

        UserManager.get.sendAdminEmail( message ).then( function( body ) {
            res.end( body );

        } ).catch( function( err ) {
            errJson( err, res );
        } );
    }
}
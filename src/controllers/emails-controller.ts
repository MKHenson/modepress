﻿import express = require( 'express' );
import controllerModule = require( './controller' );
import bodyParser = require( 'body-parser' );
import { UsersService } from '../users-service'
import { IConfig, IServer, IMessage } from 'modepress-api';
import { errJson } from '../serializers';

export default class EmailsController extends controllerModule.Controller {
	/**
	 * Creates a new instance of the email controller
	 * @param server The server configuration options
     * @param config The configuration options
     * @param e The express instance of this server
	 */
    constructor( server: IServer, config: IConfig, e: express.Express ) {
        super( null );

        server; // Supress empty param warning
        config; // Supress empty param warning

        const router = express.Router();
        router.use( bodyParser.urlencoded( { 'extended': true }) );
        router.use( bodyParser.json() );
        router.use( bodyParser.json( { type: 'application/vnd.api+json' }) );

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

        UsersService.getSingleton().sendAdminEmail( message ).then( function( body ) {
            res.end( body );

        }).catch( function( err ) {
            errJson( err, res );
        });
    }
}
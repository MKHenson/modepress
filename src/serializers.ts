'use strict';
import { IResponse } from './definitions/custom/tokens/standard-tokens';
import * as express from 'express';
import { error as logError } from './logger';

/**
 * Helper function to return a status 200 json object of type T
 */
export function okJson<T extends IResponse>( data: T, res: express.Response ) {
    if ( data.error )
        logError( data.message );

    res.setHeader( 'Content-Type', 'application/json' );
    res.end( JSON.stringify( data ) );
}

/**
 * Helper function to return a status 200 json object of type T
 */
export function errJson( err: Error, res: express.Response ) {
    logError( err.message );
    res.setHeader( 'Content-Type', 'application/json' );
    res.end( JSON.stringify( <IResponse>{ error: true, message: err.message } ) );
}
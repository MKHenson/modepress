'use strict';
import { IResponse } from 'modepress';
import * as express from 'express';
import { error as logError } from './logger';

/**
 * A decorator for transforming an async express function handler.
 * Transforms the promise's response into a serialized json with
 * a 200 response code.
 * @param errCode The type of error code to raise for errors
 */
export function j200( errCode: number = 500 ) {
  return function( target: any, propertyKey: string, descriptor: PropertyDescriptor ) {
    const originalMethod = descriptor.value;

    // Editing the descriptor/value parameter
    descriptor.value = function() {
      const res = arguments[ 1 ] as express.Response;
      const result: Promise<any> | any | null = originalMethod.apply( this, arguments );
      if ( result && result instanceof Promise ) {
        result.then( result => {
          res.setHeader( 'Content-Type', 'application/json' );
          res.status( 200 ).json( result );
        } ).catch(( err: Error ) => {
          res.setHeader( 'Content-Type', 'application/json' );
          res.status( errCode ).json( { message: err.message } );
        } );
      }
    };

    // return edited descriptor as opposed to overwriting the descriptor
    return descriptor;
  }
}

/**
 * Helper function to return a status 200 json object of type T
 */
export function okJson<T extends IResponse>( data: T, res: express.Response ) {
  res.setHeader( 'Content-Type', 'application/json' );
  res.end( JSON.stringify( data ) );
}

/**
 * Helper function to return a status 200 json object of type T
 */
export function errJson( err: Error, res: express.Response ) {
  logError( err.message );
  res.status( 500 )
  res.setHeader( 'Content-Type', 'application/json' );
  res.end( JSON.stringify( <IResponse>{ message: err.message } ) );
}
import { Readable, Writable } from 'stream';
import { createGzip, Gzip } from 'zlib';
import { IGoogleProperties } from '../../types/config/properties/i-google';
import { IRemote, IUploadOptions } from '../../types/interfaces/i-remote';
import { IBucketEntry } from '../../types/models/i-bucket-entry';
import { IFileEntry } from '../../types/models/i-file-entry';
import * as compressible from 'compressible';
import * as storage from '@google-cloud/storage';
import { generateRandString } from '../../utils/utils';
import { extname } from 'path';

export class GoogleBucket implements IRemote {
  private _zipper: Gzip;
  private _gcs: any;

  constructor() {
    this._zipper = createGzip();
  }

  async initialize( options: IGoogleProperties ) {
    this._gcs = storage( {
      projectId: options.projectId,
      keyFilename: options.keyFile
    } );
  }

  generateUrl( bucket: IBucketEntry, file: IFileEntry ) {
    return `https://storage.googleapis.com/${bucket.identifier}/${file.identifier}`;
  }

  async createBucket( bucket: IBucketEntry, options?: any ) {
    const gcs = this._gcs;
    const cors = {
      location: 'EU',
      cors: [
        {
          'origin': [
            '*'
          ],
          'method': [
            'GET',
            'OPTIONS'
          ],
          'responseHeader': [
            'content-type',
            'authorization',
            'content-length',
            'x-requested-with',
            'x-mime-type',
            'x-file-name',
            'cache-control'
          ],
          'maxAgeSeconds': 1
        }
      ]
    };

    try {
      await gcs.createBucket( bucket.identifier, cors );
    }
    catch ( err ) {
      throw new Error( `Could not create a new bucket: '${err.message}'` )
    }

    return bucket.identifier;
  }

  /**
   * Wraps a source and destination stream in a promise that catches error
   * and completion events
   */
  private handleStreamsEvents( source: Readable, dest: Writable ) {
    return new Promise( function( resolve, reject ) {
      let earlyExit = false;

      source.on( 'error', function( err: Error ) {
        if ( earlyExit )
          return;

        earlyExit = true;
        reject( new Error( `Error reading source stream for upload: '${err.message}'` ) );
      } );

      dest.on( 'error', function( err: Error ) {
        if ( earlyExit )
          return;

        earlyExit = true;
        return reject( new Error( `Error in upload stream to bucket: '${err.message}'` ) )
      } );

      dest.on( 'finish', () => {
        if ( earlyExit )
          return;

        resolve();
      } );
    } );
  }

  async uploadFile( bucket: IBucketEntry, file: IFileEntry, source: Readable, uploadOptions: IUploadOptions ) {
    const filename = generateRandString( 16 ) + extname( uploadOptions.filename );
    const b = this._gcs.bucket( bucket.identifier );
    const rawFile = b.file( filename );

    let dest: Writable;

    // Check if the stream content type is something that can be compressed
    // if so, then compress it before sending it to
    // Google and set the content encoding
    if ( compressible( uploadOptions.headers[ 'content-type' ] ) )
      dest = source.pipe( this._zipper ).pipe( rawFile.createWriteStream( <any>{ metadata: { contentEncoding: 'gzip', contentType: uploadOptions.headers[ 'content-type' ], metadata: { encoded: true } } } ) );
    else
      dest = source.pipe( rawFile.createWriteStream( <any>{ metadata: { contentType: uploadOptions.headers[ 'content-type' ] } } ) );

    await this.handleStreamsEvents( source, dest );
    await rawFile.makePublic();
    return filename;
  }

  async removeFile( bucket: IBucketEntry, file: IFileEntry ) {
    const gcs = this._gcs;
    const b: any = gcs.bucket( bucket.identifier );

    try {
      // Get the bucket and delete the file
      await b.file( file.identifier! ).delete();
    }
    catch ( err ) {
      throw new Error( `Could not remove file '${file.identifier}' from storage system: '${err.toString()}'` );
    }
  }

  async removeBucket( entry: IBucketEntry ) {
    const gcs = this._gcs;

    // Now remove the bucket itself
    const bucket: any = gcs.bucket( entry.identifier );

    try {
      await bucket.delete()
    }
    catch ( err ) {
      throw new Error( `Could not remove bucket from storage system: '${err.message}'` )
    }
  }
}

export const googleBucket = new GoogleBucket();

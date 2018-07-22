import * as assert from 'assert';
import { } from 'mocha';
import * as path from 'path';
import header from '../header';
import * as fs from 'fs';
import { IFileEntry, IVolume } from '../../../src';
import { randomString } from '../utils';
import * as FormData from 'form-data';
import { IDatabase } from '../../../src/types/config/properties/i-database';

let volume: IVolume<'client'>;
const filePath = './test/media/file.png';

describe( 'Testing successful file uploads: ', function() {

  before( async function() {
    const resp = await header.user1.post( `/volumes/user/${header.user1.username}/${randomString()}` );
    const json = await resp.json<IVolume<'client'>>();
    assert.deepEqual( resp.status, 200 );
    volume = json;
  } )

  after( async function() {
    const resp = await header.user1.delete( `/volumes/${volume._id}` );
    assert.deepEqual( resp.status, 204 );
  } )

  it( 'Can upload a single file', async function() {
    const form = new FormData();
    form.append( 'good-file', fs.createReadStream( filePath ) );
    const resp = await header.user1.post( `/files/users/${header.user1.username}/volumes/${volume._id}/upload`, form, form.getHeaders() );
    assert.equal( resp.status, 200 );
    const files = await resp.json<IFileEntry<'client'>[]>();
    assert.equal( files.length, 1 );
    assert.equal( files[ 0 ].name, 'file.png' );
    assert.equal( files[ 0 ].mimeType, 'image/png' );
    assert.deepEqual( files[ 0 ].parentFile, null );

    // Assert we have a public url
    assert( typeof ( files[ 0 ].publicURL ) === 'string' );
    assert( files[ 0 ].publicURL.length > 0 );

    assert.equal( files[ 0 ].size, 228 );
    assert.equal( files[ 0 ].user, header.user1.username );

    // Make sure the temp folder is cleaned up
    let filesInTemp = 0;

    fs.readdirSync( path.resolve( __dirname + '/../../../temp' ) ).forEach( file => {
      filesInTemp++;
    } );

    // There are 2 files expected in the temp - the .gitignore and readme.md - but thats it
    assert.equal( filesInTemp, 2 );
  } )
} )
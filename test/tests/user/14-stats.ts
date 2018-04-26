import * as assert from 'assert';
import * as fs from 'fs';
import { } from 'mocha';
import Agent from '../agent';
import header from '../header';
import { IConfig, IAdminUser, Page } from '../../../src';
import * as FormData from 'form-data';

const filePath = './test/media/file.png';
let fileId = '';

describe( '14. Getting and setting user media stat usage', function() {

  it( 'regular user updated its stats accordingly', async function() {
    const resp = await header.user1.get( `/stats/users/${header.user1.username}/get-stats` );
    assert.deepEqual( resp.status, 200 );
    const json = await resp.json();
    assert.deepEqual( json.data.apiCallsUsed, 9 );
    assert.deepEqual( json.data.memoryUsed, 226 * 2 );
  } )

  it( 'regular user did upload another file to dinosaurs2', async function() {
    const form = new FormData();
    form.append( 'small-image.png', fs.readFileSync( filePath ), { filename: 'small-image.png', contentType: 'image/png' } );
    const resp = await header.user1.post( "/buckets/dinosaurs2/upload", form, form.getHeaders() );
    assert.deepEqual( resp.status, 200 );
    const json = await resp.json();
    assert( json.tokens )
    assert.deepEqual( json.message, "Upload complete. [1] Files have been saved." );
    assert( json.tokens.length === 1 )
    assert.deepEqual( json.tokens[ 0 ].field, "small-image.png" );
    assert.deepEqual( json.tokens[ 0 ].file, "small-image.png" );
    assert( json.tokens[ 0 ].error === false )
    assert.deepEqual( json.tokens[ 0 ].errorMsg, "" );
    assert( json.tokens[ 0 ].file );
  } )

  it( 'regular user updated its stats with the 2nd upload accordingly', async function() {
    const resp = await header.user1.get( `/stats/users/${header.user1.username}/get-stats` );
    assert.deepEqual( resp.status, 200 );
    const json = await resp.json();
    assert.deepEqual( json.data.apiCallsUsed, 10 );
    assert.deepEqual( json.data.memoryUsed, 226 * 3 );
  } )

  it( 'regular user did update the api calls to 5', async function() {
    const resp = await header.user1.get( `/stats/users/${header.user1.username}/get-stats` );
    assert.deepEqual( resp.status, 200 );
    const json = await resp.json();
    assert.deepEqual( json.data.apiCallsUsed, 11 );
  } )

  it( 'regular user did upload another file to dinosaurs2', async function() {
    const form = new FormData();
    form.append( 'small-image.png', fs.readFileSync( filePath ), { filename: 'small-image.png', contentType: 'image/png' } );
    const resp = await header.user1.post( "/buckets/dinosaurs2/upload", form, form.getHeaders() );
    assert.deepEqual( resp.status, 200 );
    const json = await resp.json();
    assert( json.tokens );
    assert.deepEqual( json.message, "Upload complete. [1] Files have been saved." );
    assert( json.tokens.length === 1 )
    assert.deepEqual( json.tokens[ 0 ].field, "small-image.png" );
    assert.deepEqual( json.tokens[ 0 ].file, "small-image.png" );
    assert( json.tokens[ 0 ].error === false )
    assert.deepEqual( json.tokens[ 0 ].errorMsg, "" );
    assert( json.tokens[ 0 ].file )
  } )

  it( 'regular user fetched the uploaded file Id of the dinosaur2 bucket', async function() {
    const resp = await header.user1.get( `/files/users/${header.user1.username}/buckets/dinosaurs2` );
    assert.deepEqual( resp.status, 200 );
    const json = await resp.json();
    fileId = json.data[ 1 ].identifier;
  } )

  it( 'regular user updated its stats to reflect a file was deleted', async function() {
    const resp = await header.user1.get( `/stats/users/${header.user1.username}/get-stats` );
    assert.deepEqual( resp.status, 200 );
    const json = await resp.json();
    assert.deepEqual( json.data.apiCallsUsed, 14 );
    assert.deepEqual( json.data.memoryUsed, 226 * 3 );
  } )

  it( 'regular user updated its stats that both a file and bucket were deleted', async function() {
    const resp = await header.user1.get( `/stats/users/${header.user1.username}/get-stats` );
    assert.deepEqual( resp.status, 200 );
    const json = await resp.json();
    assert.deepEqual( json.data.apiCallsUsed, 16 );
    assert.deepEqual( json.data.memoryUsed, 226 * 2 );
  } )
} )
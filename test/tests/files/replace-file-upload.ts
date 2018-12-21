import * as assert from 'assert';
import { } from 'mocha';
import * as path from 'path';
import header from '../header';
import * as fs from 'fs';
import { IFileEntry, IVolume, IUserEntry } from '../../../src';
import { randomString } from '../utils';
import * as FormData from 'form-data';

let volume: IVolume<'client'>;
let uploadedFile: IFileEntry<'client'>;
let newFile: IFileEntry<'client'>;
const filePath = './test/media/file.png';
const filePath2 = './test/media/img-a.png';

describe( 'Testing replacing of a file upload: ', function() {

  before( async function() {
    const resp = await header.user1.post( `/volumes`, { name: randomString() } );
    const json = await resp.json<IVolume<'client'>>();
    assert.deepEqual( resp.status, 200 );
    volume = json;
  } )

  after( async function() {
    const resp = await header.user1.delete( `/volumes/${volume._id}` );
    assert.deepEqual( resp.status, 204 );
  } )

  it( 'did upload a single file', async function() {
    const form = new FormData();
    form.append( 'good-file', fs.createReadStream( filePath ) );
    const resp = await header.user1.post( `/files/volumes/${volume._id}/upload`, form, form.getHeaders() );
    assert.equal( resp.status, 200 );

    const files = await resp.json<IFileEntry<'client'>[]>();
    assert.equal( files.length, 1 );
    assert.equal( files[ 0 ].name, 'file.png' );
    assert.equal( files[ 0 ].mimeType, 'image/png' );
    assert.deepEqual( files[ 0 ].parentFile, null );

    // Assert we have a public url
    assert( typeof ( files[ 0 ].publicURL ) === 'string' );
    assert( files[ 0 ].publicURL.length > 0 );

    uploadedFile = files[ 0 ];
  } )

  it( 'did replace uploaded file, but only changed its public url', async function() {
    const form = new FormData();
    form.append( 'good-file-2', fs.createReadStream( filePath2 ) );
    const resp = await header.user1.post( `/files/replace/${uploadedFile._id}`, form, form.getHeaders() );
    assert.equal( resp.status, 200 );

    const files = await resp.json<IFileEntry<'client'>[]>();
    assert.equal( files.length, 1 );
    assert.equal( files[ 0 ].name, 'img-a.png' );
    assert.equal( files[ 0 ].mimeType, 'image/png' );
    assert.deepEqual( files[ 0 ].parentFile, null );

    // Assert we have a public url
    assert( typeof ( files[ 0 ].publicURL ) === 'string' );
    assert( files[ 0 ].publicURL.length > 0 );
    assert( typeof ( files[ 0 ].publicURL ) !== uploadedFile.publicURL );

    newFile = files[ 0 ];
  } )

  it( 'the replaced file matches the users available space', async function() {
    const resp = await header.user1.get( `/volumes/${volume._id}` );
    const json: IVolume<'client'> = await resp.json();
    assert.deepEqual( resp.status, 200 );
    assert.deepEqual( json.memoryUsed, newFile.size );
  } )
} )
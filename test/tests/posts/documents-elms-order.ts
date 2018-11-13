import * as assert from 'assert';
import { } from 'mocha';
import { IPost, IDocument, IUserEntry, IDraftElement } from '../../../src';
import ControllerFactory from '../../../src/core/controller-factory';
import { randomString } from '../utils';
import header from '../header';
import { IDraft } from '../../../src/types/models/i-draft';

let post: IPost<'client'>,
  document: IDocument<'client'>,
  user1: IUserEntry<'client'>;

let firstElm: IDraftElement<'client'>;
let secondElm: IDraftElement<'client'>;

describe( 'Testing the order of document elements: ', function() {

  before( async function() {
    const posts = ControllerFactory.get( 'posts' );
    const users = ControllerFactory.get( 'users' );
    user1 = await users.getUser( { username: 'user1' } ) as IUserEntry<'client'>;

    // Create post and comments
    post = await posts.create( {
      author: user1!._id,
      content: 'This is a temp post',
      slug: randomString(),
      title: 'Temp Post',
      public: true
    } );

    document = post.document as IDocument<'client'>;
  } )

  after( async function() {
    const posts = ControllerFactory.get( 'posts' );
    await posts.removePost( post._id );
  } )

  it( 'did add a new elements and each is added to the end of the order array', async function() {

    let resp = await header.user1.post( `/api/documents/${document._id}/elements`, {
      type: 'elm-paragraph',
      html: '<p>A</p>'
    } as IDraftElement<'client'> );
    assert.equal( resp.status, 200 );
    firstElm = await resp.json<IDraftElement<'client'>>();

    resp = await header.user1.post( `/api/documents/${document._id}/elements`, {
      type: 'elm-paragraph',
      html: '<p>B</p>'
    } as IDraftElement<'client'> );
    assert.equal( resp.status, 200 );
    secondElm = await resp.json<IDraftElement<'client'>>();

    resp = await header.user1.get( `/api/documents/${document._id}` );
    const doc = await resp.json<IDocument<'client'>>();
    const draft = doc.currentDraft as IDraft<'client'>;
    assert.equal( resp.status, 200 );
    assert.equal( draft.elementsOrder[ 1 ], firstElm._id );
    assert.equal( draft.elementsOrder[ 2 ], secondElm._id );
  } )

  it( 'did remove an element and the element id was removed from the order array', async function() {
    let resp = await header.user1.delete( `/api/documents/${document._id}/elements/${firstElm._id}` );
    assert.equal( resp.status, 204 );

    resp = await header.user1.get( `/api/documents/${document._id}` );
    const doc = await resp.json<IDocument<'client'>>();
    const draft = doc.currentDraft as IDraft<'client'>;
    assert.equal( resp.status, 200 );
    assert.equal( draft.elementsOrder[ 1 ], secondElm._id );
    assert.equal( draft.elementsOrder.length, 2 );
  } )

  it( 'did add a new element at an index and the order array was correct', async function() {
    let resp = await header.user1.post( `/api/documents/${document._id}/elements?index=1`, {
      type: 'elm-paragraph',
      html: '<p>C</p>'
    } as IDraftElement<'client'> );
    assert.equal( resp.status, 200 );
    const newElement = await resp.json<IDraftElement<'client'>>();

    resp = await header.user1.get( `/api/documents/${document._id}` );
    const doc = await resp.json<IDocument<'client'>>();
    const draft = doc.currentDraft as IDraft<'client'>;
    assert.equal( resp.status, 200 );
    assert.equal( draft.elementsOrder[ 1 ], newElement._id );
    assert.equal( draft.elementsOrder[ 2 ], secondElm._id );
    assert.equal( draft.elementsOrder.length, 3 );
  } )

  it( 'did add an element at an index -1 to the end of the order array', async function() {
    let resp = await header.user1.post( `/api/documents/${document._id}/elements?index=-1`, {
      type: 'elm-paragraph',
      html: '<p>D</p>'
    } as IDraftElement<'client'> );
    assert.equal( resp.status, 200 );
    const newElement = await resp.json<IDraftElement<'client'>>();

    resp = await header.user1.get( `/api/documents/${document._id}` );
    const doc = await resp.json<IDocument<'client'>>();
    const draft = doc.currentDraft as IDraft<'client'>;
    assert.equal( resp.status, 200 );
    assert.equal( draft.elementsOrder[ 3 ], newElement._id );
  } )

  it( 'did add an element at an index 100 to the end of the order array', async function() {
    let resp = await header.user1.post( `/api/documents/${document._id}/elements?index=100`, {
      type: 'elm-paragraph',
      html: '<p>E</p>'
    } as IDraftElement<'client'> );
    assert.equal( resp.status, 200 );
    const newElement = await resp.json<IDraftElement<'client'>>();

    resp = await header.user1.get( `/api/documents/${document._id}` );
    const doc = await resp.json<IDocument<'client'>>();
    const draft = doc.currentDraft as IDraft<'client'>;
    assert.equal( resp.status, 200 );
    assert.equal( draft.elementsOrder[ 4 ], newElement._id );
  } )
} )
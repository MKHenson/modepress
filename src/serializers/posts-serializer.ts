﻿import { IAuthReq, IUserEntry, PostTokens } from 'modepress';

import * as bodyParser from 'body-parser';
import * as mongodb from 'mongodb';
import * as express from 'express';
import * as compression from 'compression';
import { Serializer } from './serializer';
import { identifyUser, adminRights, hasId } from '../utils/permission-controllers';
import { j200 } from '../utils/response-decorators';
import { UserPrivileges } from '../core/user';
import { IBaseControler } from 'modepress';
import Factory from '../core/model-factory';
import ControllerFactory from '../core/controller-factory';
import { PostsController } from '../controllers/posts';

/**
 * A controller that deals with the management of posts
 */
export class PostsSerializer extends Serializer {

  private _options: IBaseControler;
  private _controller: PostsController;

  /**
	 * Creates a new instance of the controller
	 */
  constructor( options: IBaseControler ) {
    super( [ Factory.get( 'posts' ), Factory.get( 'categories' ) ] );
    this._options = options;
  }

  /**
   * Called to initialize this controller and its related database objects
   */
  async initialize( e: express.Express, db: mongodb.Db ) {
    this._controller = ControllerFactory.get( 'posts' );
    const router = express.Router();

    router.use( compression() );
    router.use( bodyParser.urlencoded( { 'extended': true } ) );
    router.use( bodyParser.json() );
    router.use( bodyParser.json( { type: 'application/vnd.api+json' } ) );

    router.get( '/', <any>[ identifyUser, this.getPosts.bind( this ) ] );
    router.get( '/slug/:slug', <any>[ identifyUser, this.getPost.bind( this ) ] );
    router.get( '/:id', <any>[ identifyUser, hasId( 'id', 'ID' ), this.getPost.bind( this ) ] );
    router.delete( '/:id', <any>[ adminRights, hasId( 'id', 'ID' ), this.removePost.bind( this ) ] );
    router.put( '/:id', <any>[ adminRights, hasId( 'id', 'ID' ), this.updatePost.bind( this ) ] );
    router.post( '/', <any>[ adminRights, this.createPost.bind( this ) ] );

    // Register the path
    e.use( ( this._options.rootPath || '' ) + '/posts', router );

    await super.initialize( e, db );
    return this;
  }

  /**
   * Returns an array of IPost items
   */
  @j200()
  private async getPosts( req: IAuthReq, res: express.Response ) {
    let visibility: string | undefined;
    const user = req._user;

    // Check for visibility
    if ( req.query.visibility ) {
      if ( ( <string>req.query.visibility ).toLowerCase() === 'all' )
        visibility = 'all';
      else if ( ( <string>req.query.visibility ).toLowerCase() === 'private' )
        visibility = 'private';
      else
        visibility = 'public';
    }

    // If no user we only allow public
    if ( !user )
      visibility = 'public';
    // If an admin - we do not need visibility
    else if ( user.privileges! < UserPrivileges.Admin )
      visibility = undefined;
    // Regular users only see public
    else
      visibility = 'public';

    let index: number | undefined = parseInt( req.query.index );
    let limit: number | undefined = parseInt( req.query.limit );
    index = isNaN( index ) ? undefined : index;
    limit = isNaN( limit ) ? undefined : limit;

    const response: PostTokens.GetAll.Response = await this._controller.getPosts( {
      public: visibility === 'public' ? true : false,
      keyword: req.query.keyword ? new RegExp( req.query.keyword, 'i' ) : undefined,
      author: req.query.author ? new RegExp( req.query.author, 'i' ) : undefined,
      tags: req.query.tags ? req.query.tags.split( ',' ) : undefined,
      categories: req.query.categories ? req.query.categories.split( ',' ) : undefined,
      requiredTags: req.query.rtags ? req.query.rtags.split( ',' ) : undefined,
      sort: req.query.sort ? true : false,
      sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
      minimal: req.query.minimal ? true : false,
      index: index,
      limit: limit,
      verbose: Boolean( req.query.verbose )
    } );

    return response;
  }

  /**
   * Returns a single post
   */
  @j200()
  private async getPost( req: IAuthReq, res: express.Response ) {
    const user: IUserEntry = req._user!;
    const post = await this._controller.getPost( {
      id: req.params.id,
      slug: req.params.slug,
      verbose: req.query.verbose !== undefined ? Boolean( req.query.verbose ) : false
    } )!;

    // Only admins are allowed to see private posts
    if ( !post.public && ( !user || ( user && user.privileges! > UserPrivileges.Admin ) ) )
      throw new Error( 'That post is marked private' );

    const response: PostTokens.GetOne.Response = post;
    return response;
  }

  /**
   * Attempts to remove a post by ID
   */
  @j200( 204 )
  private async removePost( req: IAuthReq, res: express.Response ) {
    await this._controller.removePost( req.params.id );
    return;
  }

  /**
   * Attempts to update a post by ID
   */
  @j200()
  private async updatePost( req: IAuthReq, res: express.Response ) {
    const token: PostTokens.Post.Body = req.body;
    const post = await this._controller.update( req.params.id, token );
    const response: PostTokens.PutOne.Response = post;
    return response;
  }

  /**
   * Attempts to create a new post
   */
  @j200()
  private async createPost( req: IAuthReq, res: express.Response ) {
    const token: PostTokens.Post.Body = req.body;

    // User is passed from the authentication function
    if ( !token.author )
      token.author = req._user!.username;

    const post = await this._controller.create( token );
    const response: PostTokens.Post.Response = {
      message: 'New post created',
      data: post
    } as PostTokens.Post.Response;

    return response;
  }
}
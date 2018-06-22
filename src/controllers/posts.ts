﻿import { IConfig } from '../types/config/i-config';
import { Page } from '../types/tokens/standard-tokens';
import { IPost } from '../types/models/i-post';
import * as mongodb from 'mongodb';
import Factory from '../core/model-factory';
import ControllerFactory from '../core/controller-factory';
import { PostsModel } from '../models/posts-model';
import Controller from './controller';
import { isValidObjectID } from '../utils/utils';

export type GetManyOptions = {
  verbose?: boolean;
  keyword?: RegExp;
  author?: RegExp;
  public?: boolean;
  tags?: string[];
  requiredTags?: string[];
  categories?: string[];
  sort?: boolean;
  sortOrder?: 'asc' | 'desc';
  minimal?: boolean;
  index?: number;
  limit?: number;
}

export type GetOneOptions = {
  id?: string;
  slug?: string;
  verbose?: boolean;
  public?: boolean;
}

/**
 * A controller that deals with the management of posts
 */
export class PostsController extends Controller {
  private _postsModel: PostsModel;

  /**
	 * Creates a new instance of the controller
	 */
  constructor( config: IConfig ) {
    super( config );
  }

  /**
   * Called to initialize this controller and its related database objects
   */
  async initialize( db: mongodb.Db ) {
    this._postsModel = Factory.get( 'posts' );
    return this;
  }

  /**
   * Returns an array of IPost items
   */
  async getPosts( options: GetManyOptions = { verbose: true } ) {
    const posts = this._postsModel;
    const findToken: Partial<IPost<'server'>> & { $or: IPost<'server'>[] } = { $or: [] };

    if ( options.author )
      ( <any>findToken ).author = options.author;

    // Check for keywords
    if ( options.keyword ) {
      findToken.$or.push( <IPost<'server'>>{ title: <any>options.keyword } );
      findToken.$or.push( <IPost<'server'>>{ content: <any>options.keyword } );
      findToken.$or.push( <IPost<'server'>>{ brief: <any>options.keyword } );
    }

    // Add the or conditions for visibility
    if ( options.public !== undefined )
      findToken.public = options.public;

    // Check for tags (an OR request with tags)
    if ( options.tags && options.tags.length > 0 ) {
      findToken.tags = { $in: options.tags } as any;
    }

    // Check for required tags (an AND request with tags)
    if ( options.requiredTags && options.requiredTags.length > 0 ) {
      if ( !findToken.tags )
        findToken.tags = { $all: options.requiredTags } as any;
      else
        ( findToken.tags as any ).$all = options.requiredTags;
    }

    // Check for categories
    if ( options.categories && options.categories.length > 0 )
      findToken.categories = { $in: options.categories } as any;


    // Set the default sort order to ascending
    let sortOrder = -1;

    if ( options.sortOrder ) {
      if ( options.sortOrder.toLowerCase() === 'asc' )
        sortOrder = 1;
      else
        sortOrder = -1;
    }

    // Sort by the date created
    let sort: Partial<IPost<'server'>> = { createdOn: sortOrder };

    // Optionally sort by the last updated
    if ( options.sort )
      sort = { lastUpdated: sortOrder };

    let getContent: boolean = true;
    if ( options.minimal )
      getContent = false;

    // Stephen is lovely
    if ( findToken.$or.length === 0 )
      delete findToken.$or;

    // First get the count
    const count = await posts.count( findToken );
    const index: number = options.index || 0;
    const limit: number = options.limit || 10;
    const verbose = options.verbose !== undefined ? options.verbose : true;
    const sanitizedData = await posts.downloadMany<IPost<'client'>>( {
      selector: findToken,
      sort: sort,
      index: index,
      limit: limit,
      projection: ( getContent === false ? { content: 0 } : undefined )
    }, {
        expandForeignKeys: true,
        verbose: verbose,
        expandMaxDepth: 1
      } );

    const response: Page<IPost<'client'>> = {
      count: count,
      data: sanitizedData,
      index: index,
      limit: limit
    };

    return response;
  }

  /**
   * Removes a post by ID
   * @param id The id of the post we are removing
   */
  async removePost( id: string ) {

    if ( !isValidObjectID( id ) )
      throw new Error( `Please use a valid object id` );

    const commentsFactory = ControllerFactory.get( 'comments' );
    const comments = await commentsFactory.getAll( { postId: id, expanded: false, limit: -1 } );
    const promises: Promise<any>[] = [];
    for ( const comment of comments.data )
      promises.push( commentsFactory.remove( comment._id ) );

    await Promise.all( promises );

    // Attempt to delete the instances
    const numRemoved = await this._postsModel.deleteInstances( { _id: new mongodb.ObjectID( id ) } );

    if ( numRemoved === 0 )
      throw new Error( 'Could not find a post with that ID' );

    return;
  }

  /**
   * Updates a post resource
   * @param id The id of the post to edit
   * @param token The edit token
   */
  async update( id: string, token: IPost<'client'> ) {

    if ( !isValidObjectID( id ) )
      throw new Error( `Please use a valid object id` );

    const updatedPost = await this._postsModel.update<IPost<'client'>>( { _id: new mongodb.ObjectID( id ) }, token );
    return updatedPost;
  }

  /**
   * Creates a new post
   * @param token The initial post data
   */
  async create( token: Partial<IPost<'client'>> ) {
    const schema = await this._postsModel.createInstance( token );
    const json = await schema.downloadToken<IPost<'client'>>( { verbose: true, expandForeignKeys: true, expandMaxDepth: 1 } );
    return json;
  }

  /**
   * Gets a single post resource
   * @param options Options for getting the post resource
   */
  async getPost( options: GetOneOptions = { verbose: true } ) {
    const posts = this._postsModel;
    let findToken: Partial<IPost<'server'>>;

    if ( options.id )
      findToken = { _id: new mongodb.ObjectID( options.id ) };
    else if ( options.slug )
      findToken = { slug: options.slug };
    else
      throw new Error( `You must specify either an id or slug when fetching a post` );

    if ( options.public !== undefined )
      findToken.public = options.public;

    const post = await posts!.downloadOne<IPost<'client'>>( findToken, {
      verbose: options.verbose !== undefined ? options.verbose : true,
      expandForeignKeys: true,
      expandMaxDepth: 1
    } );

    if ( !post )
      throw new Error( 'Could not find post' );

    const sanitizedData = await post;
    return sanitizedData;
  }
}
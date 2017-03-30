﻿import * as bodyParser from 'body-parser';
import * as mongodb from 'mongodb';
import * as express from 'express';
import * as compression from 'compression';
import { Controller } from './controller';
import { Model } from '../models/model';
import { PostsModel } from '../models/posts-model';
import { CategoriesModel } from '../models/categories-model';
import { identifyUser, checkVerbosity, adminRights, hasId } from '../permission-controllers';
import { okJson, errJson } from '../serializers';
import { UserPrivileges } from '../users';

/**
 * A controller that deals with the management of posts
 */
export default class PostsController extends Controller {
	/**
	 * Creates a new instance of the controller
	 * @param server The server configuration options
     * @param config The configuration options
     * @param e The express instance of this server
	 */
    constructor( server: Modepress.IServer, config: Modepress.IConfig, e: express.Express ) {
        super( [ Model.registerModel( PostsModel ), Model.registerModel( CategoriesModel ) ] );

        const router = express.Router();

        router.use( compression() );
        router.use( bodyParser.urlencoded( { 'extended': true } ) );
        router.use( bodyParser.json() );
        router.use( bodyParser.json( { type: 'application/vnd.api+json' } ) );

        router.get( '/posts', <any>[ identifyUser, checkVerbosity, this.getPosts.bind( this ) ] );
        router.get( '/posts/slug/:slug', <any>[ identifyUser, checkVerbosity, this.getPost.bind( this ) ] );
        router.get( '/posts/:id', <any>[ identifyUser, checkVerbosity, hasId( 'id', 'ID' ), this.getPost.bind( this ) ] );
        router.delete( '/posts/:id', <any>[ adminRights, hasId( 'id', 'ID' ), this.removePost.bind( this ) ] );
        router.put( '/posts/:id', <any>[ adminRights, hasId( 'id', 'ID' ), this.updatePost.bind( this ) ] );
        router.post( '/posts', <any>[ adminRights, this.createPost.bind( this ) ] );

        router.get( '/categories', this.getCategories.bind( this ) );
        router.post( '/categories', <any>[ adminRights, this.createCategory.bind( this ) ] );
        router.delete( '/categories/:id', <any>[ adminRights, hasId( 'id', 'ID' ), this.removeCategory.bind( this ) ] );

        // Register the path
        e.use( '/api', router );
    }

    /**
     * Returns an array of IPost items
     */
    private async getPosts( req: Modepress.IAuthReq, res: express.Response ) {
        const posts = this.getModel( 'posts' );
        let count = 0;
        let visibility: string | undefined = undefined;
        const user = req._user;

        const findToken = { $or: [] as Modepress.IPost[] };
        if ( req.query.author )
            ( <any>findToken ).author = new RegExp( req.query.author, 'i' );

        // Check for keywords
        if ( req.query.keyword ) {
            findToken.$or.push( <Modepress.IPost>{ title: <any>new RegExp( req.query.keyword, 'i' ) } );
            findToken.$or.push( <Modepress.IPost>{ content: <any>new RegExp( req.query.keyword, 'i' ) } );
            findToken.$or.push( <Modepress.IPost>{ brief: <any>new RegExp( req.query.keyword, 'i' ) } );
        }

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

        // Add the or conditions for visibility
        if ( visibility )
            ( <Modepress.IPost>findToken ).public = visibility === 'public' ? true : false;



        // Check for tags (an OR request with tags)
        if ( req.query.tags ) {
            const tags = req.query.tags.split( ',' );
            if ( tags.length > 0 )
                ( <any>findToken ).tags = { $in: tags };
        }

        // Check for required tags (an AND request with tags)
        if ( req.query.rtags ) {
            const rtags = req.query.rtags.split( ',' );
            if ( rtags.length > 0 ) {
                if ( !( <any>findToken ).tags )
                    ( <any>findToken ).tags = { $all: rtags };
                else
                    ( <any>findToken ).tags.$all = rtags;
            }
        }

        // Check for categories
        if ( req.query.categories ) {
            const categories = req.query.categories.split( ',' );
            if ( categories.length > 0 )
                ( <any>findToken ).categories = { $in: categories };
        }

        // Set the default sort order to ascending
        let sortOrder = -1;

        if ( req.query.sortOrder ) {
            if ( ( <string>req.query.sortOrder ).toLowerCase() === 'asc' )
                sortOrder = 1;
            else
                sortOrder = -1;
        }

        // Sort by the date created
        let sort: Modepress.IPost = { createdOn: sortOrder };

        // Optionally sort by the last updated
        if ( req.query.sort ) {
            if ( req.query.sort === 'true' )
                sort = { lastUpdated: sortOrder };
        }

        let getContent: boolean = true;
        if ( req.query.minimal )
            getContent = false;

        // Stephen is lovely
        if ( findToken.$or.length === 0 )
            delete findToken.$or;

        try {
            // First get the count
            count = await posts!.count( findToken );

            let index: number | undefined;
            let limit: number | undefined;
            if ( req.query.index !== undefined )
                index = parseInt( req.query.index );
            if ( req.query.limit !== undefined )
                limit = parseInt( req.query.limit );

            const instances = await posts!.findInstances<Modepress.IPost>( findToken, sort, index, limit, ( getContent === false ? { content: 0 } : undefined ) );

            const jsons: Array<Promise<Modepress.IPost>> = [];
            for ( let i = 0, l = instances.length; i < l; i++ )
                jsons.push( instances[ i ].schema.getAsJson<Modepress.IPost>( instances[ i ]._id, { verbose: Boolean( req.query.verbose ) } ) );

            const sanitizedData = await Promise.all( jsons );

            okJson<Modepress.IGetPosts>( {
                error: false,
                count: count,
                message: `Found ${count} posts`,
                data: sanitizedData
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Returns a single post
     */
    private async getPost( req: Modepress.IAuthReq, res: express.Response ) {
        const posts = this.getModel( 'posts' );
        let findToken: Modepress.IPost;
        const user: Modepress.IUserEntry = req._user!;

        try {
            if ( req.params.id )
                findToken = { _id: new mongodb.ObjectID( req.params.id ) };
            else
                findToken = { slug: req.params.slug };

            const instances = await posts!.findInstances<Modepress.IPost>( findToken, null, 0, 1 );

            if ( instances.length === 0 )
                throw new Error( 'Could not find post' );


            const isPublic = await instances[ 0 ].schema.getByName( 'public' )!.getValue();
            // Only admins are allowed to see private posts
            if ( !isPublic && ( !user || (user && user.privileges! > UserPrivileges.Admin) ) )
                throw new Error( 'That post is marked private' );

            const jsons: Array<Promise<Modepress.IPost>> = [];
            for ( let i = 0, l = instances.length; i < l; i++ )
                jsons.push( instances[ i ].schema.getAsJson<Modepress.IPost>( instances[ i ]._id, { verbose: Boolean( req.query.verbose ) } ) );

            const sanitizedData = await Promise.all( jsons );

            okJson<Modepress.IGetPost>( {
                error: false,
                message: `Found ${sanitizedData.length} posts`,
                data: sanitizedData[ 0 ]
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Returns an array of ICategory items
     */
    private async getCategories( req: Modepress.IAuthReq, res: express.Response ) {
        const categories = this.getModel( 'categories' )!;

        try {
            const instances = await categories.findInstances<Modepress.ICategory>( {}, {}, parseInt( req.query.index ), parseInt( req.query.limit ) );

            const jsons: Array<Promise<Modepress.ICategory>> = [];
            for ( let i = 0, l = instances.length; i < l; i++ )
                jsons.push( instances[ i ].schema.getAsJson<Modepress.ICategory>( instances[ i ]._id, { verbose: Boolean( req.query.verbose ) } ) );

            const sanitizedData = await Promise.all( jsons );

            okJson<Modepress.IGetCategories>( {
                error: false,
                count: sanitizedData.length,
                message: `Found ${sanitizedData.length} categories`,
                data: sanitizedData
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Attempts to remove a post by ID
     */
    private async removePost( req: Modepress.IAuthReq, res: express.Response ) {
        const posts = this.getModel( 'posts' )!;

        try {
            // Attempt to delete the instances
            const numRemoved = await posts.deleteInstances( <Modepress.IPost>{ _id: new mongodb.ObjectID( req.params.id ) } );

            if ( numRemoved === 0 )
                throw new Error( 'Could not find a post with that ID' );

            okJson<Modepress.IResponse>( {
                error: false,
                message: 'Post has been successfully removed'
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Attempts to remove a category by ID
     */
    private async removeCategory( req: Modepress.IAuthReq, res: express.Response ) {
        const categories = this.getModel( 'categories' )!;

        try {
            const numRemoved = await categories.deleteInstances( <Modepress.ICategory>{ _id: new mongodb.ObjectID( req.params.id ) } );

            if ( numRemoved === 0 )
                return Promise.reject( new Error( 'Could not find a category with that ID' ) );

            okJson<Modepress.IResponse>( {
                error: false,
                message: 'Category has been successfully removed'
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Attempts to update a post by ID
     */
    private async updatePost( req: Modepress.IAuthReq, res: express.Response ) {
        const token: Modepress.IPost = req.body;
        const posts = this.getModel( 'posts' )!;

        try {
            const instance = await posts.update( <Modepress.IPost>{ _id: new mongodb.ObjectID( req.params.id ) }, token );

            if ( instance.error )
                throw new Error( <string>instance.tokens[ 0 ].error );

            if ( instance.tokens.length === 0 )
                throw new Error( 'Could not find post with that id' );

            okJson<Modepress.IResponse>( {
                error: false,
                message: 'Post Updated'
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Attempts to create a new post
     */
    private async createPost( req: Modepress.IAuthReq, res: express.Response ) {
        const token: Modepress.IPost = req.body;
        const posts = this.getModel( 'posts' )!;

        // User is passed from the authentication function
        token.author = req._user!.username;

        try {
            const instance = await posts.createInstance( token );
            const json = await instance.schema.getAsJson( instance._id, { verbose: true } );

            okJson<Modepress.IGetPost>( {
                error: false,
                message: 'New post created',
                data: json
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Attempts to create a new category item
     */
    private async createCategory( req: Modepress.IAuthReq, res: express.Response ) {
        const token: Modepress.ICategory = req.body;
        const categories = this.getModel( 'categories' )!;

        try {
            const instance = await categories.createInstance( token );
            const json = await instance.schema.getAsJson( instance._id, { verbose: true } );

            okJson<Modepress.IGetCategory>( {
                error: false,
                message: 'New category created',
                data: json
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }
}
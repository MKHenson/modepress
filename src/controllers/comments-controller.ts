﻿import * as bodyParser from 'body-parser';
import * as mongodb from 'mongodb';
import * as entities from 'entities';
import * as express from 'express';
import * as compression from 'compression';
import { Controller } from './controller';
import { Model, ModelInstance } from '../models/model';
import { CommentsModel } from '../models/comments-model';
import { UsersService } from '../users-service';
import { getUser, isAdmin, canEdit, hasId, userExists } from '../permission-controllers';
import * as mp from 'modepress-api';
import * as winston from 'winston';
import { okJson, errJson } from '../serializers';

/**
 * A controller that deals with the management of comments
 */
export default class CommentsController extends Controller {
	/**
	 * Creates a new instance of the controller
	 * @param server The server configuration options
     * @param config The configuration options
     * @param e The express instance of this server
	 */
    constructor( server: mp.IServer, config: mp.IConfig, e: express.Express ) {
        super( [ Model.registerModel( CommentsModel ) ] );

        server; // Supress empty param warning
        config; // Supress empty param warning

        const router = express.Router();

        router.use( compression() );
        router.use( bodyParser.urlencoded( { 'extended': true }) );
        router.use( bodyParser.json() );
        router.use( bodyParser.json( { type: 'application/vnd.api+json' }) );

        router.get( '/comments', <any>[ isAdmin, this.getComments.bind( this ) ] );
        router.get( '/comments/:id', <any>[ hasId( 'id', 'ID' ), getUser, this.getComment.bind( this ) ] );
        router.get( '/nested-comments/:parentId', <any>[ hasId( 'parentId', 'parent ID' ), getUser, this.getComments.bind( this ) ] );
        router.get( '/users/:user/comments', <any>[ userExists, getUser, this.getComments.bind( this ) ] );
        router.delete( '/comments/:id', <any>[ getUser, hasId( 'id', 'ID' ), this.remove.bind( this ) ] );
        router.put( '/comments/:id', <any>[ getUser, hasId( 'id', 'ID' ), this.update.bind( this ) ] );
        router.post( '/posts/:postId/comments/:parent?', <any>[ canEdit, hasId( 'postId', 'parent ID' ), hasId( 'parent', 'Parent ID', true ), this.create.bind( this ) ] );

        // Register the path
        e.use( '/api', router );
    }

    /**
     * Returns an array of IComment items
     */
    private async getComments( req: mp.IAuthReq, res: express.Response ) {
        const comments = this.getModel( 'comments' ) !;
        let count = 0;
        let visibility = 'public';
        const user = req._user;
        const findToken = { $or: [] as mp.IComment[] };

        // Set the parent filter
        if ( req.query.parentId )
            ( <mp.IComment>findToken ).parent = req.query.parentId;

        // Set the user property if its provided
        if ( req.query.user )
            ( <mp.IComment>findToken ).author = <any>new RegExp( req.query.user, 'i' );

        // Check for keywords
        if ( req.query.keyword )
            findToken.$or.push( <mp.IComment>{ content: <any>new RegExp( req.query.keyword, 'i' ) });

        // Check for visibility
        if ( req.query.visibility ) {
            if ( ( <string>req.query.visibility ).toLowerCase() == 'all' )
                visibility = 'all';
            else if ( ( <string>req.query.visibility ).toLowerCase() == 'private' )
                visibility = 'private';
        }
        else
            visibility = 'all';

        const users = UsersService.getSingleton();

        // Only admins are allowed to see private comments
        if ( !user || ( ( visibility == 'all' || visibility == 'private' ) && users.isAdmin( user ) == false ) )
            visibility = 'public';

        // Add the or conditions for visibility
        if ( visibility != 'all' ) {
            if ( visibility == 'public' )
                ( <mp.IComment>findToken ).public = true;
            else
                ( <mp.IComment>findToken ).public = false;
        }

        // Set the default sort order to ascending
        let sortOrder = -1;
        if ( req.query.sortOrder ) {
            if ( ( <string>req.query.sortOrder ).toLowerCase() == 'asc' )
                sortOrder = 1;
            else
                sortOrder = -1;
        }

        // Sort by the date created
        let sort: mp.IComment = { createdOn: sortOrder };

        // Optionally sort by the last updated
        if ( req.query.sort ) {
            if ( req.query.sort == 'updated' )
                sort = { lastUpdated: sortOrder };
        }

        if ( findToken.$or.length == 0 )
            delete findToken.$or;

        try {
            // First get the count
            count = await comments.count( findToken );

            const instances = await comments.findInstances<mp.IComment>( findToken, [ sort ], parseInt( req.query.index ), parseInt( req.query.limit ) );

            const jsons: Array<Promise<mp.IComment>> = [];
            for ( let i = 0, l = instances.length; i < l; i++ )
                jsons.push( instances[ i ].schema.getAsJson<mp.IComment>( instances[ i ]._id, {
                    verbose: Boolean( req.query.verbose ),
                    expandForeignKeys: Boolean( req.query.expanded ),
                    expandMaxDepth: parseInt( req.query.depth || 1 ),
                    expandSchemaBlacklist: [ 'parent' ]
                }) );

            const sanitizedData = await Promise.all( jsons );

            okJson<mp.IGetComments>( {
                error: false,
                count: count,
                message: `Found ${count} comments`,
                data: sanitizedData
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Returns a single comment
     */
    private async getComment( req: mp.IAuthReq, res: express.Response ) {
        try {
            const comments = this.getModel( 'comments' ) !;
            const findToken: mp.IComment = { _id: new mongodb.ObjectID( req.params.id ) };
            const user = req._user;

            const instances = await comments.findInstances<mp.IComment>( findToken, [], 0, 1 );

            if ( instances.length == 0 )
                throw new Error( 'Could not find comment' );

            const users = UsersService.getSingleton();
            const isPublic = await instances[ 0 ].schema.getByName( 'public' ) !.getValue()

            // Only admins are allowed to see private comments
            if ( !isPublic && ( !user || users.isAdmin( user ) == false ) )
                throw new Error( 'That comment is marked private' );

            const jsons: Array<Promise<mp.IComment>> = [];
            for ( let i = 0, l = instances.length; i < l; i++ )
                jsons.push( instances[ i ].schema.getAsJson<mp.IComment>( instances[ i ]._id, {
                    verbose: Boolean( req.query.verbose ),
                    expandForeignKeys: Boolean( req.query.expanded ),
                    expandMaxDepth: parseInt( req.query.depth || 1 ),
                    expandSchemaBlacklist: [ 'parent' ]
                }) );

            const sanitizedData = await Promise.all( jsons );

            okJson<mp.IGetComment>( {
                error: false,
                message: `Found ${sanitizedData.length} comments`,
                data: sanitizedData[ 0 ]
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Attempts to remove a comment by ID
     */
    private async remove( req: mp.IAuthReq, res: express.Response ) {
        const comments = this.getModel( 'comments' ) !;
        const findToken: mp.IComment = {
            _id: new mongodb.ObjectID( req.params.id )
        }

        try {
            const user = req._user;
            const users = UsersService.getSingleton();
            const instances = await comments.findInstances<mp.IComment>( findToken, [], 0, 1 );

            if ( instances.length == 0 )
                throw new Error( 'Could not find a comment with that ID' );
            else {
                const author = await instances[ 0 ].schema.getByName( 'author' ) !.getValue();

                // Only admins are allowed to see private comments
                if ( !user || ( !users.isAdmin( user ) && user.username != author ) )
                    throw new Error( 'You do not have permission' );
            }

            // Attempt to delete the instances
            const numRemoved = await comments.deleteInstances( findToken );
            okJson<mp.IResponse>( {
                error: false,
                message: 'Comment has been successfully removed'
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Attempts to update a comment by ID
     */
    private async update( req: mp.IAuthReq, res: express.Response ) {
        const token: mp.IComment = req.body;
        const comments = this.getModel( 'comments' ) !;
        const findToken: mp.IComment = {
            _id: new mongodb.ObjectID( req.params.id )
        }

        try {
            const user = req._user;
            const users = UsersService.getSingleton();
            const instances = await comments.findInstances<mp.IComment>( findToken, [], 0, 1 );

            if ( instances.length == 0 )
                throw new Error( 'Could not find comment with that id' );
            else {
                const author = await instances[ 0 ].schema.getByName( 'author' ) !.getValue();

                // Only admins are allowed to see private comments
                if ( !user || ( !users.isAdmin( user ) && user.username != author ) )
                    throw new Error( 'You do not have permission' );
            }

            const instance = await comments.update( findToken, token );

            if ( instance.error )
                throw new Error( <string>instance.tokens[ 0 ].error );

            okJson<mp.IResponse>( {
                error: false,
                message: 'Comment Updated'
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Attempts to create a new comment
     */
    private async create( req: mp.IAuthReq, res: express.Response ) {
        const token: mp.IComment = req.body;
        const comments = this.getModel( 'comments' ) !;

        // User is passed from the authentication function
        token.author = req._user!.username;
        token.post = req.params.postId;
        token.parent = req.params.parent;
        let parent: ModelInstance<mp.IComment> | null = null;

        try {
            if ( token.parent ) {
                parent = await comments.findOne<mp.IComment>( <mp.IModelEntry>{ _id: new mongodb.ObjectID( token.parent ) });
                if ( !parent )
                    throw new Error( `No comment exists with the id ${token.parent}` );
            }

            const instance = await comments.createInstance( token );
            const json = await instance.schema.getAsJson( instance._id, { verbose: true });


            // Assign this comment as a child to its parent comment if it exists
            if ( parent ) {
                const children: Array<string> = parent.schema.getByName( 'children' ) !.value;
                children.push( instance.dbEntry!._id );
                await parent.model.update<mp.IComment>( <mp.IComment>{ _id: parent.dbEntry._id }, { children: children })
            }

            okJson<mp.IGetComment>( {
                error: false,
                message: 'New comment created',
                data: json
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }
}
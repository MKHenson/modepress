﻿import { IConfig } from '../definitions/custom/config/i-config';
import { IServer } from '../definitions/custom/config/i-server';
import { IAuthReq } from '../definitions/custom/tokens/i-auth-request';
import { IRender } from '../definitions/custom/models/i-render';
import { IGetRenders, IResponse } from '../definitions/custom/tokens/standard-tokens';
import * as mongodb from 'mongodb';
import { error as logError, info } from '../utils/logger';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { Controller } from './controller';
import { RendersModel } from '../models/renders-model';
import { ModelInstance, Model } from '../models/model';
import * as url from 'url';
import * as jsdom from 'jsdom';
import { okJson, errJson } from '../utils/serializers';
import { adminRights } from '../utils/permission-controllers'

/**
 * Sets up a prerender server and saves the rendered html requests to mongodb.
 * These saved HTML documents can then be sent to web crawlers who cannot interpret javascript.
 */
export default class PageRenderer extends Controller {
    private renderQueryFlag: string;
    private expiration: number;

    // googlebot, yahoo, and bingbot are not in this list because
    // we support _escaped_fragment_ and want to ensure people aren't
    // penalized for cloaking.
    private static crawlerUserAgents: Array<string> = [
        // 'googlebot',
        // 'yahoo',
        // 'bingbot',
        'baiduspider',
        'facebookexternalhit',
        'twitterbot',
        'rogerbot',
        'linkedinbot',
        'embedly',
        'quora link preview',
        'showyoubot',
        'outbrain',
        'pinterest/0.',
        'developers.google.com/+/web/snippet',
        'slackbot',
        'vkShare',
        'W3C_Validator',
        'redditbot',
        'Applebot',
        'WhatsApp',
        'flipboard',
        'tumblr',
        'bitlybot',
        'SkypeUriPreview',
        'nuzzel',
        'Discordbot',
        'Google Page Speed',
        'Qwantify'
    ];

    private static extensionsToIgnore: Array<string> = [
        '.js',
        '.css',
        '.xml',
        '.less',
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.pdf',
        '.doc',
        '.txt',
        '.ico',
        '.rss',
        '.zip',
        '.mp3',
        '.rar',
        '.exe',
        '.wmv',
        '.doc',
        '.avi',
        '.ppt',
        '.mpg',
        '.mpeg',
        '.tif',
        '.wav',
        '.mov',
        '.psd',
        '.ai',
        '.xls',
        '.mp4',
        '.m4a',
        '.swf',
        '.dat',
        '.dmg',
        '.iso',
        '.flv',
        '.m4v',
        '.torrent'
    ];

    /**
	 * Creates a new instance of the email controller
	 * @param server The server configuration options
     * @param config The configuration options
     * @param e The express instance of this server
	 */
    constructor( server: IServer, config: IConfig, e: express.Express ) {
        super( [ Model.registerModel( RendersModel ) ] );

        server; // Supress empty param warning
        config; // Supress empty param warning

        if ( !config.enableAjaxRendering )
            return;

        this.renderQueryFlag = '__render__request';
        e.use( this.processBotRequest.bind( this ) );
        this.expiration = config.ajaxRenderExpiration * 1000;

        const router = express.Router();
        router.use( bodyParser.urlencoded( { 'extended': true } ) );
        router.use( bodyParser.json() );
        router.use( bodyParser.json( { type: 'application/vnd.api+json' } ) );

        router.get( '/', <any>[ adminRights, this.getRenders.bind( this ) ] );
        router.get( '/preview/:id', <any>[ this.previewRender.bind( this ) ] );
        router.delete( '/clear', <any>[ adminRights, this.clearRenders.bind( this ) ] );
        router.delete( '/:id', <any>[ adminRights, this.removeRender.bind( this ) ] );

        // Register the path
        e.use( '/api/renders', router );
    }

    /**
     * Strips the html page of any script tags
     */
    private stripScripts( html: string ): string {
        const matches = html.match( /<script(?:.*?)>(?:[\S\s]*?)<\/script>/gi );
        for ( let i = 0; matches && i < matches.length; i++ )
            if ( matches[ i ].indexOf( 'application/ld+json' ) === -1 )
                html = html.replace( matches[ i ], '' );

        return html;
    }

    /**
     * Gets the URL of a request
     */
    getUrl( req: express.Request ): string {
        let protocol = req.protocol;
        if ( req.get( 'CF-Visitor' ) ) {
            const match = req.get( 'CF-Visitor' ).match( /'scheme':'(http|https)'/ );
            if ( match ) protocol = match[ 1 ];
        }
        if ( req.get( 'X-Forwarded-Proto' ) ) {
            protocol = req.get( 'X-Forwarded-Proto' ).split( ',' )[ 0 ];
        }

        let addQueryMark: boolean = false;
        if ( !req.query || Object.keys( req.query ).length === 0 )
            addQueryMark = true;

        return protocol + '://' + req.get( 'host' ) + req.url + ( addQueryMark ? `?${this.renderQueryFlag}=true` : `&${this.renderQueryFlag}=true` );
    }

    /**
     * Fetches a page and strips it of all its script tags
     */
    private renderPage( url: string ): Promise<string> {
        return new Promise<string>(( resolve, reject ) => {
            let timer: NodeJS.Timer;
            let win;
            const maxTries = 50;
            let curTries = 0;

            const checkComplete = () => {
                if ( !win ) {
                    // Cleanup
                    clearTimeout( timer );
                    win.close();
                    win = null;
                    throw new Error( 'Page does not exist' );
                }

                curTries++;
                if ( win.prerenderReady === undefined || win.prerenderReady || curTries > maxTries ) {
                    const html = this.stripScripts( win.document.documentElement.outerHTML );

                    // Cleanup
                    clearTimeout( timer );
                    win.close();
                    win = null;
                    return resolve( html );
                }

                timer = setTimeout( checkComplete, 300 );
            }

            jsdom.env( {
                url: url,
                features: {
                    FetchExternalResources: [ 'script' ],
                    ProcessExternalResources: [ 'script' ],
                    SkipExternalResources: false
                },
                done: function( errors, window ) {
                    if ( errors && errors.length > 0 )
                        return reject( errors[ 0 ] );

                    win = window;
                    checkComplete();
                }
            } );
        } );
    }

    /**
     * Determines if the request comes from a bot. If so, a prerendered page is sent back which excludes any script tags
     */
    async processBotRequest( req: express.Request, res: express.Response, next: Function ) {
        if ( req.query.__render__request )
            return next();

        // Its not a bot request - do nothing
        if ( !this.shouldShowPrerenderedPage( req ) )
            return next();

        const model = this.getModel( 'renders' )!;
        const url = this.getUrl( req );
        let instance: ModelInstance<IRender> | null = null;
        let expiration = 0;

        try {
            instance = await model.findOne<IRender>( { url: url } );
            let html = '';

            if ( instance ) {
                expiration = instance.dbEntry.expiration!;
                let html = instance.dbEntry.html!;

                if ( Date.now() > expiration )
                    html = await this.renderPage( url );
                else if ( !html || html.trim() === '' )
                    html = await this.renderPage( url );
            }
            else
                html = await this.renderPage( url );

            if ( !instance ) {
                info( `Saving render '${url}'` );
                await model.createInstance<IRender>( <IRender>{ expiration: Date.now() + this.expiration, html: html, url: url } );
            }
            else if ( Date.now() > expiration ) {
                info( `Updating render '${url}'` );
                await model.update<IRender>( <IRender>{ _id: instance.dbEntry._id }, { expiration: Date.now() + this.expiration, html: html } );
            }

            info( 'Sending back render without script tags' );

            res.status( 200 );
            return res.send( html );

        } catch ( err ) {
            res.status( 404 );
            return res.send( 'Page does not exist' );
        };
    };

    /**
     * Determines if the request comes from a bot
     */
    private shouldShowPrerenderedPage( req: express.Request ): boolean {
        const userAgent = req.headers[ 'user-agent' ]
            , bufferAgent = req.headers[ 'x-bufferbot' ];
        let isRequestingPrerenderedPage = false;

        if ( !userAgent ) return false;
        if ( req.method !== 'GET' && req.method !== 'HEAD' ) return false;

        // if it contains _escaped_fragment_, show prerendered page
        const parsedQuery = url.parse( req.url, true ).query;
        if ( parsedQuery && parsedQuery[ '_escaped_fragment_' ] !== undefined ) isRequestingPrerenderedPage = true;

        // if it is a bot...show prerendered page
        if ( PageRenderer.crawlerUserAgents.some( function( crawlerUserAgent ) { return userAgent.toLowerCase().indexOf( crawlerUserAgent.toLowerCase() ) !== -1; } ) ) isRequestingPrerenderedPage = true;

        // if it is BufferBot...show prerendered page
        if ( bufferAgent ) isRequestingPrerenderedPage = true;

        // if it is a bot and is requesting a resource...dont prerender
        if ( PageRenderer.extensionsToIgnore.some( function( extension ) { return req.url.indexOf( extension ) !== -1; } ) ) return false;

        return isRequestingPrerenderedPage;
    }

    /**
     * Attempts to find a render by ID and then display it back to the user
     */
    private async previewRender( req: express.Request, res: express.Response ) {
        res.setHeader( 'Content-Type', 'text/html' );
        const renders = this.getModel( 'renders' );

        try {
            const instances = await renders!.findInstances<IRender>( { selector: <IRender>{ _id: new mongodb.ObjectID( req.params.id ) } } );

            if ( instances.length === 0 )
                throw new Error( 'Could not find a render with that ID' );

            let html: string = await instances[ 0 ].schema.getByName( 'html' )!.getValue();
            const matches = html.match( /<script(?:.*?)>(?:[\S\s]*?)<\/script>/gi );
            for ( let i = 0; matches && i < matches.length; i++ )
                if ( matches[ i ].indexOf( 'application/ld+json' ) === -1 ) {
                    html = html.replace( matches[ i ], '' );
                }

            res.end( html );

        } catch ( error ) {
            logError( error.message );
            res.writeHead( 404 );
        };
    }

    /**
     * Attempts to remove a render by ID
     */
    private async removeRender( req: IAuthReq, res: express.Response ) {
        const renders = this.getModel( 'renders' );

        try {
            const numRemoved = await renders!.deleteInstances( <IRender>{ _id: new mongodb.ObjectID( req.params.id ) } );

            if ( numRemoved === 0 )
                throw new Error( 'Could not find a cache with that ID' );

            okJson<IResponse>( {
                error: false,
                message: 'Cache has been successfully removed'
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Returns an array of IPost items
     */
    private async getRenders( req: IAuthReq, res: express.Response ) {
        const renders = this.getModel( 'renders' );
        let count = 0;
        const findToken = {};

        // Set the default sort order to ascending
        let sortOrder = -1;
        if ( req.query.sortOrder ) {
            if ( ( <string>req.query.sortOrder ).toLowerCase() === 'asc' )
                sortOrder = 1;
            else
                sortOrder = -1;
        }

        // Sort by the date created
        const sort: IRender = { createdOn: sortOrder };

        let getContent: boolean = true;
        if ( req.query.minimal )
            getContent = false;

        // Check for keywords
        if ( req.query.search )
            ( <IRender>findToken ).url = <any>new RegExp( req.query.search, 'i' );

        try {
            // First get the count
            count = await renders!.count( findToken );
            const instances = await renders!.findInstances<IRender>( {
                selector: findToken,
                sort: sort,
                index: parseInt( req.query.index ),
                limit: parseInt( req.query.limit ),
                projection: ( getContent === false ? { html: 0 } : undefined )
            } );

            const jsons: Array<Promise<IRender>> = [];
            for ( let i = 0, l = instances.length; i < l; i++ )
                jsons.push( instances[ i ].schema.getAsJson<IRender>( instances[ i ]._id, { verbose: Boolean( req.query.verbose ) } ) );

            const sanitizedData = await Promise.all( jsons );

            okJson<IGetRenders>( {
                error: false,
                count: count,
                message: `Found ${count} renders`,
                data: sanitizedData
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }

    /**
     * Removes all cache items from the db
     */
    private async clearRenders( req: IAuthReq, res: express.Response ) {
        const renders = this.getModel( 'renders' );

        try {
            // First get the count
            const num = await renders!.deleteInstances( {} );

            okJson<IResponse>( {
                error: false,
                message: `${num} Instances have been removed`
            }, res );

        } catch ( err ) {
            errJson( err, res );
        };
    }
}
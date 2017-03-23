﻿import * as fs from 'fs';
import { error, info, clear, initializeLogger } from './logger';
import * as yargs from 'yargs';
import { Server as MongoServer, Db } from 'mongodb';
import { Server } from './server';
import { ConsoleManager } from './console/console-manager';
import { prepare } from './db-preparation';

let config: Modepress.IConfig | null = null;
const args = yargs.argv;

// Start the logger
initializeLogger();


// If no logging - remove all transports
if ( args.logging && args.logging.toLowerCase().trim() === 'false' ) {
    clear();
}

// Make sure the config path argument is there
if ( !args.config || args.config.trim() === '' ) {
    error( 'No config file specified. Please start modepress with the config path in the argument list. Eg: node main.js --config="./config.js"' );
    process.exit();
}

// Make sure the file exists
if ( !fs.existsSync( args.config ) ) {
    error( `Could not locate the config file at '${args.config}'` );
    process.exit();
}

try {
    // Try load and parse the config
    config = JSON.parse( fs.readFileSync( args.config, 'utf8' ) );
}
catch ( err ) {
    error( `Could not parse the config file - make sure its valid JSON` );
    process.exit();
}


// // Attempt to connect to Users
// if ( config!.usersSocketURL !== '' ) {
//     info( `Attempting to connect to users socket at: '${config!.usersSocketURL}'` );
//     new EventManager( config! ).init().catch( function() {
//         error( `Could not connect to user socket even though it was specified at: '${config!.usersSocketURL}'` );
//         process.exit();
//     } );
// }

/**
 * initialization function to prep DB and servers
 */
async function initialize() {
    info( `Attempting to connect to mongodb...` );

    const mongoServer = new MongoServer( config!.databaseHost, config!.databasePort, config!.databaseName );
    const mongoDB = new Db( config!.databaseName, mongoServer, { w: 1 } );
    const db = await mongoDB.open();

    info( `Successfully connected to '${config!.databaseName}' at ${config!.databaseHost}:${config!.databasePort}` );
    info( `Starting up HTTP servers...` );

    // Create each of your servers here
    const promises: Array<Promise<any>> = [];

    await prepare( db, config! );

    // Load the servers
    for ( let i = 0, l = config!.servers.length; i < l; i++ ) {
        const server = new Server( config!.servers[ i ], config!, db );
        promises.push( server.initialize( db ) );
    }

    // Load each of the servers
    await Promise.all( promises );

    info( `Server instances loaded...` );

    // Create the console manager
    new ConsoleManager().initialize();
}

// Start the server initialization
initialize().catch(( err: Error ) => {
    error( err.message ).then(() => process.exit() );
} );
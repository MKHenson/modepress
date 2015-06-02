﻿// set up ========================
import * as express from "express";
var app = express();									// create our app with express
import * as morgan from "morgan";						// log requests to the console
import * as bodyParser from "body-parser";				// pull information from HTML POST
import * as methodOverride from "method-override";		// Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it.
import * as mongodb from "mongodb";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import * as colors from "webinate-colors";

// Custom imports
import {MongoWrapper} from "./lib/MongoWrapper";
import {loadConfig, ServerConfig} from "./lib/Config";
import {Controller} from "./lib/controllers/Controller"
import {PostsController} from "./lib/controllers/PostsController";
import {EmailsController} from "./lib/controllers/EmailsController";
import {UsersService} from "./lib/UsersService";

var config: ServerConfig = null;

// Make sure the config path argument is there
if (process.argv.length < 3)
{
    colors.log(colors.red("No config file specified. Please start modepress with the config path in the argument list. Eg: node main.js ./config.js debug"));
    process.exit();
}

// Make sure the config name argument is there
if (process.argv.length < 4)
{
    colors.log(colors.red("No config name specified in the argument list. Eg: node main.js ./config.js debug"));
    process.exit();
}

// Make sure the file exists
if (!fs.existsSync(process.argv[2]))
{
    colors.log(colors.red(`Could not locate the config file at '${process.argv[2]}'`));
    process.exit();
}

// Load a config file
loadConfig(process.argv[3], process.argv[2] )

// Config file is loaded
.then(function (cfg)
{
	config = cfg;
	console.log(`Attempting to connect to mongodb...`);
	return MongoWrapper.connect(config.host, config.portDatabase, config.databaseName);

}).then(function (db)
{
	// Database loaded
	console.log(`Successfully connected to '${config.databaseName}' at ${config.host}:${config.portDatabase}`);
	console.log(`Starting up HTTP${config.ssl ? "S" : ""} server at ${config.host}:${config.portHTTP}...`);

    // set the static files location /public/img will be /img for users
    app.use(express.static(`${config.path}`, {}));
    for (var i = 0, l = config.staticFilesFolder.length; i < l; i++ )
        app.use(express.static(config.staticFilesFolder[i], {}));
    
    // Setup the jade template engine
    app.set('views', './views');
    app.set('view engine', 'jade');
    
	// log every request to the console
    app.use(morgan('dev'));
    
	// Set the appropriate middlewares
	app.use(bodyParser.urlencoded({ 'extended': true }));
	app.use(bodyParser.json());
	app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
    app.use(methodOverride());

    UsersService.getSingleton(config.usersURL);
	
	// Create each of your controllers here
	var controllerPromises: Array<Promise<any>> = [];
	var controllers: Array<Controller> = [
        new EmailsController(app, config.emailAdmin, config.emailFrom,
            config.emailService, config.emailServiceUser, config.emailServicePassword),
        new PostsController(app)
	];

    // Get the default page
    app.get(`(${config.adminURL}|${config.adminURL}/*)`, function (req, res)
    {
        console.log("Sending admin: " + `${config.path}/index.html`);
        res.render('index', { path: `${config.ssl ? "https" : "http" }://${config.host}:${config.ssl ? config.portHTTPS : config.portHTTP }` });
	});
	
	// Get the default page
	app.get("*", function(req, res)
	{
		// Load the single view file (angular will handle the page changes on the front-end)
		res.sendfile(config.html);
	});

	console.log(`Attempting to start HTTP server...`);

	// Start app with node server.js 
	var httpServer = http.createServer(app);
	httpServer.listen(config.portHTTP);
	console.log(`Listening on HTTP port ${config.portHTTP}`);

	// If we use SSL then start listening for that as well
	if (config.ssl)
	{
		console.log(`Attempting to start SSL server...`);
		var httpsServer = https.createServer({ key: config.sslKey, cert: config.sslCert, passphrase: config.sslPassPhrase, ca: config.sslCA }, app);
		httpsServer.listen(config.portHTTPS ? config.portHTTPS : 443);
		console.log(`Listening on HTTPS port ${config.portHTTPS}`);
	}

	// Initialize all the controllers
	for (var i = 0, l = controllers.length; i < l; i++)
		controllerPromises.push(controllers[i].initialize(db));
	
	// Return a promise once all the controllers are complete
	Promise.all(controllerPromises).then(function (e)
	{
		colors.log(colors.green(`All controllers are now setup successfully!`));

	}).catch(function (e: Error)
	{
		colors.log( colors.red(`ERROR: An error has occurred while setting up the controllers "${e.message}"`) );
	});

}).catch(function (error: Error)
{
	// Error occurred
	colors.log( colors.red(`An error has occurred: ${error.message} @${(<any>error).stack}`) );
	process.exit();
});
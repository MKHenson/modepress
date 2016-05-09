"use strict";
const express = require("express");
var app = express(); // create our app with express
const fs = require("fs");
const winston = require("winston");
const yargs = require("yargs");
const readline = require("readline");
const mongo_wrapper_1 = require("./mongo-wrapper");
const users_service_1 = require("./users-service");
const server_1 = require("./server");
const event_manager_1 = require("./event-manager");
var config = null;
var args = yargs.argv;
// Add the console colours
winston.addColors({ debug: 'green', info: 'cyan', silly: 'magenta', warn: 'yellow', error: 'red' });
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { level: 'debug', colorize: true });
// Saves logs to file
if (args.logFile && args.logFile.trim() != "")
    winston.add(winston.transports.File, { filename: args.logFile, maxsize: 50000000, maxFiles: 1, tailable: true });
// If no logging - remove all transports
if (args.logging && args.logging.toLowerCase().trim() == "false") {
    winston.clear();
}
// Make sure the config path argument is there
if (!args.config || args.config.trim() == "") {
    winston.error("No config file specified. Please start modepress with the config path in the argument list. Eg: node main.js --config='./config.js'", { process: process.pid });
    process.exit();
}
// Make sure the file exists
if (!fs.existsSync(args.config)) {
    winston.error(`Could not locate the config file at '${args.config}'`, { process: process.pid });
    process.exit();
}
try {
    // Try load and parse the config
    config = JSON.parse(fs.readFileSync(args.config, "utf8"));
}
catch (err) {
    winston.error(`Could not parse the config file - make sure its valid JSON`, { process: process.pid });
    process.exit();
}
// Attempt to connect to Users
if (config.usersSocketURL != "") {
    winston.info(`Attempting to connect to users socket at: '${config.usersSocketURL}'`, { process: process.pid });
    new event_manager_1.EventManager(config).init().catch(function (err) {
        winston.error(`Could not connect to user socket even though it was specified at: '${config.usersSocketURL}'`, { process: process.pid });
        process.exit();
    });
}
winston.info(`Attempting to connect to mongodb...`, { process: process.pid });
mongo_wrapper_1.MongoWrapper.connect(config.databaseHost, config.databasePort, config.databaseName).then(function (db) {
    // Database loaded
    winston.info(`Successfully connected to '${config.databaseName}' at ${config.databaseHost}:${config.databasePort}`, { process: process.pid });
    winston.info(`Starting up HTTP servers...`, { process: process.pid });
    // Create each of your controllers here
    var promises = [];
    users_service_1.UsersService.getSingleton(config);
    // Load the controllers
    for (var i = 0, l = config.servers.length; i < l; i++) {
        var server = new server_1.Server(config.servers[i], config, db);
        promises.push(server.initialize(db));
    }
    // Return a promise once all the controllers are complete
    Promise.all(promises).then(function (e) {
        winston.info(`Servers up and runnning`, { process: process.pid });
        // Create the readline interface
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        // Set the prompt to be a >
        rl.setPrompt('> ');
        rl.prompt();
        var heapdump = null;
        // Now each time the user hits enter
        rl.on("line", function (line) {
            switch (line.trim()) {
                case 'debug':
                    try {
                        if (!heapdump)
                            heapdump = require('heapdump');
                        if (!fs.existsSync("./snapshots")) {
                            fs.mkdirSync("snapshots");
                            console.log(`Created folder snapshots`);
                        }
                        heapdump.writeSnapshot(`./snapshots/${Date.now()}.heapsnapshot`, function (err, filename) {
                            if (err)
                                console.log(`An error occurred while writing to heapdump ${err.toString()}`);
                            else
                                console.log(`Heapdump saved to ${filename}`);
                        });
                    }
                    catch (err) {
                        console.log(`An error has occurred: ${err.toString()}`);
                        if (!heapdump) {
                            console.log(`Heapdump is not installed.`);
                            console.log(`Please run 'npm install heapdump' to download the module`);
                            console.log(`Then run 'node-gyp configure build' to install it.`);
                        }
                    }
                    break;
                case "exit":
                    console.log(`Bye!`);
                    process.exit(0);
                case "gc":
                    if (global && global.gc) {
                        global.gc();
                        console.log(`Forced a garbge collection`);
                    }
                    else
                        console.log(`You cannot force garbage collection without adding the command line argument --expose-gc eg: 'node --expose-gc test.js'`);
                    break;
                default:
                    console.log(`Sorry, command not recognised: '${line.trim()}'`);
                    break;
            }
            rl.prompt();
        });
    }).catch(function (e) {
        winston.error(e.message, { process: process.pid });
    });
}).catch(function (error) {
    // Error occurred
    winston.error(`An error has occurred: ${error.message} @${error.stack}`, { process: process.pid }, function () {
        process.exit();
    });
});

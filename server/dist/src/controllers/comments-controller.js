"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var express = require("express");
var compression = require("compression");
var controller_1 = require("./controller");
var model_1 = require("../models/model");
var comments_model_1 = require("../models/comments-model");
var users_service_1 = require("../users-service");
var permission_controllers_1 = require("../permission-controllers");
var winston = require("winston");
/**
* A controller that deals with the management of comments
*/
var CommentsController = (function (_super) {
    __extends(CommentsController, _super);
    /**
    * Creates a new instance of the controller
    * @param {IServer} server The server configuration options
    * @param {IConfig} config The configuration options
    * @param {express.Express} e The express instance of this server
    */
    function CommentsController(server, config, e) {
        _super.call(this, [model_1.Model.registerModel(comments_model_1.CommentsModel)]);
        var router = express.Router();
        router.use(compression());
        router.use(bodyParser.urlencoded({ 'extended': true }));
        router.use(bodyParser.json());
        router.use(bodyParser.json({ type: 'application/vnd.api+json' }));
        router.get("/comments", [permission_controllers_1.isAdmin, this.getComments.bind(this)]);
        router.get("/users/:user/comments/:id", [permission_controllers_1.hasId, this.getComment.bind(this)]);
        router.delete("/users/:user/comments/:id", [permission_controllers_1.canEdit, permission_controllers_1.hasId, this.remove.bind(this)]);
        router.put("/users/:user/comments/:id", [permission_controllers_1.canEdit, permission_controllers_1.hasId, this.update.bind(this)]);
        router.post("/comments/:target", [permission_controllers_1.canEdit, this.verifyTarget, this.create.bind(this)]);
        // Register the path
        e.use("/api", router);
    }
    /**
    * Returns an array of IComment items
    * @param {mp.IAuthReq} req
    * @param {express.Response} res
    * @param {Function} next
    */
    CommentsController.prototype.getComments = function (req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        var comments = this.getModel("comments");
        var that = this;
        var count = 0;
        var visibility = "public";
        var user = req._user;
        var findToken = { $or: [] };
        if (req.query.author)
            findToken.author = new RegExp(req.query.author, "i");
        // Check for keywords
        if (req.query.keyword)
            findToken.$or.push({ content: new RegExp(req.query.keyword, "i") });
        // Check for visibility
        if (req.query.visibility) {
            if (req.query.visibility.toLowerCase() == "all")
                visibility = "all";
            else if (req.query.visibility.toLowerCase() == "private")
                visibility = "private";
        }
        else
            visibility = "all";
        var users = users_service_1.UsersService.getSingleton();
        // Only admins are allowed to see private comments
        if (!user || ((visibility == "all" || visibility == "private") && users.hasPermission(user, 2) == false))
            visibility = "public";
        // Add the or conditions for visibility
        if (visibility != "all") {
            if (visibility == "public")
                findToken.public = true;
            else
                findToken.public = false;
        }
        // Set the default sort order to ascending
        var sortOrder = -1;
        if (req.query.sortOrder) {
            if (req.query.sortOrder.toLowerCase() == "asc")
                sortOrder = 1;
            else
                sortOrder = -1;
        }
        // Sort by the date created
        var sort = { createdOn: sortOrder };
        // Optionally sort by the last updated
        if (req.query.sort) {
            if (req.query.sort == "updated")
                sort = { lastUpdated: sortOrder };
        }
        // Stephen is lovely
        if (findToken.$or.length == 0)
            delete findToken.$or;
        // First get the count
        comments.count(findToken).then(function (num) {
            count = num;
            return comments.findInstances(findToken, [sort], parseInt(req.query.index), parseInt(req.query.limit));
        }).then(function (instances) {
            var sanitizedData = [];
            for (var i = 0, l = instances.length; i < l; i++)
                sanitizedData.push(instances[i].schema.getAsJson(Boolean(req.query.verbose), instances[i]._id));
            return Promise.all(sanitizedData);
        }).then(function (sanitizedData) {
            res.end(JSON.stringify({
                error: false,
                count: count,
                message: "Found " + count + " comments",
                data: sanitizedData
            }));
        }).catch(function (error) {
            winston.error(error.message, { process: process.pid });
            res.end(JSON.stringify({
                error: true,
                message: error.message
            }));
        });
    };
    /**
    * Returns a single comment
    * @param {mp.IAuthReq} req
    * @param {express.Response} res
    * @param {Function} next
    */
    CommentsController.prototype.getComment = function (req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        var comments = this.getModel("comments");
        var that = this;
        var findToken = { _id: new mongodb.ObjectID(req.params.id) };
        var user = req._user;
        comments.findInstances(findToken, [], 0, 1).then(function (instances) {
            if (instances.length == 0)
                return Promise.reject(new Error("Could not find comment"));
            var users = users_service_1.UsersService.getSingleton();
            // Only admins are allowed to see private comments
            if (!instances[0].schema.getByName("public").getValue() && (!user || users.hasPermission(user, 2) == false))
                return Promise.reject(new Error("That comment is marked private"));
            var sanitizedData = [];
            for (var i = 0, l = instances.length; i < l; i++)
                sanitizedData.push(instances[i].schema.getAsJson(Boolean(req.query.verbose), instances[i]._id));
            return Promise.all(sanitizedData);
        }).then(function (sanitizedData) {
            res.end(JSON.stringify({
                error: false,
                message: "Found " + sanitizedData.length + " comments",
                data: sanitizedData[0]
            }));
        }).catch(function (error) {
            winston.error(error.message, { process: process.pid });
            res.end(JSON.stringify({
                error: true,
                message: error.message
            }));
        });
    };
    /**
    * Checks the request for a target ID. This will throw an error if none is found, or its invalid
    * @param {mp.IAuthReq} req
    * @param {express.Response} res
    * @param {Function} next
    */
    CommentsController.prototype.verifyTarget = function (req, res, next) {
        // Make sure the target id
        if (!req.params.target) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
                error: true,
                message: "Please specify a target ID"
            }));
        }
        else if (!mongodb.ObjectID.isValid(req.params.target)) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
                error: true,
                message: "Invalid target ID format"
            }));
        }
    };
    /**
    * Attempts to remove a comment by ID
    * @param {express.Request} req
    * @param {express.Response} res
    * @param {Function} next
    */
    CommentsController.prototype.remove = function (req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        var comments = this.getModel("comments");
        var findToken = {
            _id: new mongodb.ObjectID(req.params.id),
            author: req._user.username
        };
        // Attempt to delete the instances
        comments.deleteInstances(findToken).then(function (numRemoved) {
            if (numRemoved == 0)
                return Promise.reject(new Error("Could not find a comment with that ID"));
            res.end(JSON.stringify({
                error: false,
                message: "Comment has been successfully removed"
            }));
        }).catch(function (error) {
            winston.error(error.message, { process: process.pid });
            res.end(JSON.stringify({
                error: true,
                message: error.message
            }));
        });
    };
    /**
    * Attempts to update a comment by ID
    * @param {mp.IAuthReq} req
    * @param {express.Response} res
    * @param {Function} next
    */
    CommentsController.prototype.update = function (req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        var token = req.body;
        var comments = this.getModel("comments");
        var findToken = {
            _id: new mongodb.ObjectID(req.params.id),
            author: req._user.username
        };
        comments.update(findToken, token).then(function (instance) {
            if (instance.error)
                return Promise.reject(new Error(instance.tokens[0].error));
            if (instance.tokens.length == 0)
                return Promise.reject(new Error("Could not find comment with that id"));
            res.end(JSON.stringify({ error: false, message: "Comment Updated" }));
        }).catch(function (error) {
            winston.error(error.message, { process: process.pid });
            res.end(JSON.stringify({
                error: true,
                message: error.message
            }));
        });
    };
    /**
    * Attempts to create a new comment.
    * @param {IAuthReq} req
    * @param {express.Response} res
    * @param {Function} next
    */
    CommentsController.prototype.create = function (req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        var token = req.body;
        var comments = this.getModel("comments");
        // User is passed from the authentication function
        token.author = req._user.username;
        token.responseTarget = req.params.target;
        comments.createInstance(token).then(function (instance) {
            return instance.schema.getAsJson(true, instance._id);
        }).then(function (json) {
            res.end(JSON.stringify({
                error: false,
                message: "New comment created",
                data: json
            }));
        }).catch(function (error) {
            winston.error(error.message, { process: process.pid });
            res.end(JSON.stringify({
                error: true,
                message: error.message
            }));
        });
    };
    return CommentsController;
}(controller_1.Controller));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommentsController;

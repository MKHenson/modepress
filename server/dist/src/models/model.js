"use strict";
const schema_1 = require("./schema");
const winston = require("winston");
/**
* An instance of a model with its own unique schema and ID. The initial schema is a clone
* the parent model's
*/
class ModelInstance {
    /**
    * Creates a model instance
    */
    constructor(model, dbEntry) {
        this.model = model;
        this.schema = model.defaultSchema.clone();
        this._id = null;
        this.dbEntry = dbEntry;
    }
    /**
    * Gets a string representation of all fields that are unique
    * @returns {string}
    */
    uniqueFieldNames() {
        var instance = this;
        var uniqueNames = "";
        var items = instance.schema.getItems();
        for (var i = 0, l = items.length; i < l; i++)
            if (items[i].getUnique())
                uniqueNames += items[i].name + ", ";
        if (uniqueNames != "")
            uniqueNames = uniqueNames.slice(0, uniqueNames.length - 2);
        return uniqueNames;
    }
}
exports.ModelInstance = ModelInstance;
/**
* Models map data in the application/client to data in the database
*/
class Model {
    /**
    * Creates an instance of a Model
    * @param {string} collection The collection name associated with this model
    */
    constructor(collection) {
        this.collection = null;
        this._collectionName = collection;
        this._initialized = false;
        this.defaultSchema = new schema_1.Schema();
        if (Model._registeredModels[collection])
            throw new Error(`You cannot create model '${collection}' as its already been registered`);
        // Register the model
        Model._registeredModels[collection] = this;
    }
    /**
     * Returns a new model of a given type. However if the model was already registered before,
     * then the previously created model is returned.
     * @param {any} modelConstructor The model class
     * @returns {Model} Returns the registered model
     */
    static registerModel(modelConstructor) {
        var models = Model._registeredModels;
        for (var i in models)
            if (modelConstructor == models[i].constructor)
                return models[i];
        return new modelConstructor();
    }
    /**
     * Returns a registered model by its name
     * @param {string} name The name of the model to fetch
     * @returns {Model} Returns the registered model or null if none exists
     */
    static getByName(name) {
        return Model._registeredModels[name];
    }
    /**
     * Creates an index for a collection
     * @param {string} name The name of the field we are setting an index of
     * @param {mongodb.Collection} collection The collection we are setting the index on
     */
    createIndex(name, collection) {
        return new Promise(function (resolve, reject) {
            collection.createIndex(name, function (err, index) {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
    * Gets the name of the collection associated with this model
    * @returns {string}
    */
    get collectionName() { return this._collectionName; }
    /**
    * Initializes the model by setting up the database collections
    * @param {mongodb.Db} db The database used to create this model
    * @returns {Promise<mongodb.Db>}
    */
    initialize(db) {
        var model = this;
        return new Promise(function (resolve, reject) {
            // If the collection already exists - then we do not have to create it
            if (model._initialized) {
                resolve(model);
                return;
            }
            // The collection does not exist - so create it
            db.createCollection(model._collectionName, function (err, collection) {
                if (err || !collection)
                    return reject(new Error("Error creating collection: " + err.message));
                else {
                    model.collection = collection;
                    // First remove all existing indices
                    collection.dropIndexes().then(function (response) {
                        // Now re-create the models who need index supports
                        var promises = [];
                        var items = model.defaultSchema.getItems();
                        for (var i = 0, l = items.length; i < l; i++)
                            if (items[i].getIndexable())
                                promises.push(model.createIndex(items[i].name, collection));
                        if (promises.length == 0) {
                            model._initialized = true;
                            return Promise.resolve([]);
                        }
                        return Promise.all(promises);
                    }).then(function (models) {
                        model._initialized = true;
                        winston.info(`Successfully created model '${model._collectionName}'`, { process: process.pid });
                        return resolve(model);
                    }).catch(function (err) {
                        return reject(err);
                    });
                }
            });
        });
    }
    /**
    * Gets the number of DB entries based on the selector
    * @param {any} selector The mongodb selector
    * @returns {Promise<Array<ModelInstance<T>>>}
    */
    count(selector) {
        var that = this;
        var model = this;
        return new Promise(function (resolve, reject) {
            var collection = model.collection;
            if (!collection || !model._initialized)
                reject(new Error("The model has not been initialized"));
            else {
                collection.count(selector, function (err, result) {
                    if (err)
                        reject(err);
                    else
                        resolve(result);
                });
            }
        });
    }
    /**
    * Gets an arrray of instances based on the selector search criteria
    * @param {any} selector The mongodb selector
    * @param {any} sort Specify an array of items to sort.
    * Each item key represents a field, and its associated number can be either 1 or -1 (asc / desc)
    * @param {number} startIndex The start index of where to select from
    * @param {number} limit The number of results to fetch
    * @param {any} projection See http://docs.mongodb.org/manual/reference/method/db.collection.find/#projections
    * @returns {Promise<Array<ModelInstance<T>>>}
    */
    findInstances(selector, sort, startIndex = 0, limit = 0, projection) {
        var model = this;
        return new Promise(function (resolve, reject) {
            var collection = model.collection;
            if (!collection || !model._initialized)
                reject(new Error("The model has not been initialized"));
            else {
                // Attempt to save the data to mongo collection
                collection.find(selector).limit(limit).skip(startIndex).project(projection || {}).sort(sort).toArray().then(function (result) {
                    // Create the instance array
                    var instances = [], instance;
                    // For each data entry, create a new instance
                    for (var i = 0, l = result.length; i < l; i++) {
                        instance = new ModelInstance(model, result[i]);
                        instance.schema.deserialize(result[i]);
                        instance._id = result[i]._id;
                        instances.push(instance);
                    }
                    // Complete
                    resolve(instances);
                }).catch(function (err) {
                    reject(err);
                });
            }
        });
    }
    /**
    * Gets a model instance based on the selector criteria
    * @param {any} selector The mongodb selector
    * @param {any} projection See http://docs.mongodb.org/manual/reference/method/db.collection.find/#projections
    * @returns {Promise<ModelInstance<T>>}
    */
    findOne(selector, projection) {
        var model = this;
        return new Promise(function (resolve, reject) {
            var collection = model.collection;
            if (!collection || !model._initialized)
                reject(new Error("The model has not been initialized"));
            else {
                // Attempt to save the data to mongo collection
                collection.find(selector).limit(1).project(projection || {}).next().then(function (result) {
                    // Check for errors
                    if (!result)
                        return resolve(null);
                    else {
                        // Create the instance array
                        var instance;
                        instance = new ModelInstance(model, result);
                        instance.schema.deserialize(result);
                        instance._id = result._id;
                        // Complete
                        return resolve(instance);
                    }
                }).catch(function (err) {
                    reject(err);
                });
            }
        });
    }
    /**
    * Deletes a instance and all its dependencies are updated or deleted accordingly
    * @returns {Promise<any>}
    */
    deleteInstance(instance) {
        var that = this;
        var foreignModel;
        var optionalDependencies = instance.dbEntry._optionalDependencies;
        var requiredDependencies = instance.dbEntry._requiredDependencies;
        var promises = [];
        return new Promise(function (resolve, reject) {
            // Nullify all dependencies that are optional
            if (optionalDependencies)
                for (var i = 0, l = optionalDependencies.length; i < l; i++) {
                    foreignModel = Model.getByName(optionalDependencies[i].collection);
                    if (!foreignModel)
                        continue;
                    var setToken = { $set: {} };
                    setToken.$set[optionalDependencies[i].propertyName] = null;
                    promises.push(foreignModel.collection.updateOne({ _id: optionalDependencies[i]._id }, setToken));
                }
            // For those dependencies that are required, we delete the instances
            if (requiredDependencies)
                for (var i = 0, l = requiredDependencies.length; i < l; i++) {
                    foreignModel = Model.getByName(requiredDependencies[i].collection);
                    if (!foreignModel)
                        continue;
                    foreignModel.findInstances({ _id: requiredDependencies[i]._id }).then(function (instances) {
                        instances.forEach(function (instanceToDelete) {
                            promises.push(that.deleteInstance(instanceToDelete));
                        });
                    });
                }
            Promise.all(promises).then(function () {
                // Remove the original instance from the DB
                that.collection.deleteMany({ _id: instance.dbEntry._id }).then(function (deleteResult) {
                    resolve();
                }).catch(function (err) {
                    reject(err);
                });
            }).catch(function (err) {
                reject(err);
            });
        });
    }
    /**
    * Deletes a number of instances based on the selector. The promise reports how many items were deleted
    * @returns {Promise<number>}
    */
    deleteInstances(selector) {
        var model = this;
        var that = this;
        return new Promise(function (resolve, reject) {
            that.findInstances(selector).then(function (instances) {
                if (!instances || instances.length == 0)
                    return resolve(0);
                var promises = [];
                instances.forEach(function (instance, index) {
                    promises.push(that.deleteInstance(instance));
                });
                Promise.all(promises).then(function () {
                    resolve(instances.length);
                }).catch(function (err) {
                    reject(err);
                });
            });
        });
    }
    /**
    * Updates a selection of instances. The update process will fetch all instances, validate the new data and check that
    * unique fields are still being respected. An array is returned of each instance along with an error string if anything went wrong
    * with updating the specific instance.
    * @param {any} selector The selector for updating instances
    * @param {any} data The data object that will attempt to set the instance's schema variables
    * @returns {Promise<UpdateRequest<T>>} An array of objects that contains the field error and instance. Error is false if nothing
    * went wrong when updating the specific instance, and a string message if something did in fact go wrong
    */
    update(selector, data) {
        var that = this;
        return new Promise(function (resolve, reject) {
            var toRet = {
                error: false,
                tokens: []
            };
            that.findInstances(selector).then(function (instances) {
                if (!instances || instances.length == 0)
                    return resolve(toRet);
                instances.forEach(function (instance, index) {
                    // If we have data, then set the variables
                    if (data)
                        instance.schema.set(data);
                    // Make sure the new updates are valid
                    instance.schema.validate(false).then(function () {
                        // Make sure any unique fields are still being respected
                        return that.checkUniqueness(instance);
                    }).then(function (unique) {
                        if (!unique) {
                            toRet.error = true;
                            toRet.tokens.push({ error: `'${instance.uniqueFieldNames()}' must be unique`, instance: instance });
                            if (index == instances.length - 1)
                                return resolve(toRet);
                            else
                                return;
                        }
                        // Transform the schema into a JSON ready format
                        var json = instance.schema.serialize();
                        var collection = that.collection;
                        collection.updateOne({ _id: instance._id }, { $set: json }).then(function (updateResult) {
                            toRet.tokens.push({ error: false, instance: instance });
                            if (index == instances.length - 1)
                                return resolve(toRet);
                            else
                                return;
                        }).catch(function (err) {
                            toRet.error = true;
                            toRet.tokens.push({ error: err.message, instance: instance });
                            if (index == instances.length - 1)
                                return resolve(toRet);
                            else
                                return;
                        });
                    }).catch(function (err) {
                        toRet.error = true;
                        toRet.tokens.push({ error: err.message, instance: instance });
                        if (index == instances.length - 1)
                            return resolve(toRet);
                        else
                            return;
                    });
                });
            }).catch(function (err) {
                // Report what happened
                reject(err);
            });
        });
    }
    /**
    * Creates a new model instance. The default schema is saved in the database and an instance is returned on success.
    * @param {any} data [Optional] You can pass a data object that will attempt to set the instance's schema variables
    * by parsing the data object and setting each schema item's value by the name/value in the data object.
    * @returns {Promise<boolean>}
    */
    checkUniqueness(instance) {
        var that = this;
        return new Promise(function (resolve, reject) {
            var items = instance.schema.getItems();
            var hasUniqueField = false;
            var searchToken = { $or: [] };
            if (instance._id)
                searchToken["_id"] = { $ne: instance._id };
            for (var i = 0, l = items.length; i < l; i++) {
                if (items[i].getUnique()) {
                    hasUniqueField = true;
                    var searchField = {};
                    searchField[items[i].name] = items[i].getDbValue();
                    searchToken.$or.push(searchField);
                }
                else if (items[i].getUniqueIndexer())
                    searchToken[items[i].name] = items[i].getDbValue();
            }
            if (!hasUniqueField)
                return resolve(true);
            else {
                that.collection.count(searchToken, function (error, result) {
                    if (error)
                        return reject(error);
                    if (result == 0)
                        resolve(true);
                    else
                        resolve(false);
                });
            }
        });
    }
    /**
    * Creates a new model instance. The default schema is saved in the database and an instance is returned on success.
    * @param {any} data [Optional] You can pass a data object that will attempt to set the instance's schema variables
    * by parsing the data object and setting each schema item's value by the name/value in the data object.
    * @returns {Promise<ModelInstance<T>>}
    */
    createInstance(data) {
        var that = this;
        return new Promise(function (resolve, reject) {
            var newInstance = new ModelInstance(that, null);
            // If we have data, then set the variables
            if (data)
                newInstance.schema.set(data);
            that.checkUniqueness(newInstance).then(function (unique) {
                if (!unique)
                    return Promise.reject(new Error(`'${newInstance.uniqueFieldNames()}' must be unique`));
                // Now try to create a new instance
                return that.insert([newInstance]);
            }).then(function (instance) {
                // All ok
                resolve(instance[0]);
            }).catch(function (err) {
                // Report what happened
                reject(err);
            });
        });
    }
    /**
    * Attempts to insert an array of instances of this model into the database.
    * @param {Promise<Array<ModelInstance<T>>>} instances An array of instances to save
    * @returns {Promise<Array<ModelInstance<T>>>}
    */
    insert(instances) {
        var model = this;
        return new Promise(function (resolve, reject) {
            var collection = model.collection;
            if (!collection || !model._initialized)
                reject(new Error("The model has not been initialized"));
            else {
                var instance;
                var documents = [];
                var promises = [];
                // Make sure the parameters are valid
                for (var i = 0, l = instances.length; i < l; i++)
                    promises.push(instances[i].schema.validate(true));
                Promise.all(promises).then(function (schemas) {
                    // Transform the schema into a JSON ready format
                    for (var i = 0, l = schemas.length; i < l; i++) {
                        var json = schemas[i].serialize();
                        documents.push(json);
                    }
                    // Attempt to save the data to mongo collection
                    return collection.insertMany(documents);
                }).then(function (insertResult) {
                    // Assign the ID's
                    for (var i = 0, l = insertResult.ops.length; i < l; i++)
                        instances[i]._id = insertResult.ops[i]._id;
                    resolve(instances);
                }).catch(function (err) {
                    reject(err);
                });
            }
        });
    }
}
Model._registeredModels = {};
exports.Model = Model;

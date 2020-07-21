﻿import express = require('express');
import bodyParser = require('body-parser');
import ControllerFactory from '../core/controller-factory';
import { UsersController } from '../controllers/users';
import { Router } from './router';
import { j200 } from '../decorators/responses';
import { validId } from '../decorators/path-sanity';
import { admin, identify, authorize, hasPermission } from '../decorators/permissions';
import { IBaseControler } from '../types/misc/i-base-controller';
import { IAuthReq } from '../types/tokens/i-auth-request';
import { Page } from '../types/tokens/standard-tokens';
import * as compression from 'compression';
import * as mongodb from 'mongodb';
import Factory from '../core/model-factory';
import { IUserEntry } from '..';
import { Error404, Error403, Error400 } from '../utils/errors';

/**
 * Main class to use for managing user data
 */
export class UserRouter extends Router {
  private _options: IBaseControler;
  private _userController: UsersController;

  /**
   * Creates an instance of the user manager
   */
  constructor(options: IBaseControler) {
    super([Factory.get('users')]);
    this._options = options;
  }

  /**
   * Called to initialize this controller and its related database objects
   */
  async initialize(e: express.Express, db: mongodb.Db) {
    this._userController = ControllerFactory.get('users');

    // Setup the rest calls
    const router = express.Router();
    router.use(compression());
    router.use(bodyParser.urlencoded({ extended: true }));
    router.use(bodyParser.json());
    router.use(bodyParser.json({ type: 'application/vnd.api+json' }));

    router.get('/', this.getUsers.bind(this));
    router.put('/:id', this.edit.bind(this));
    router.post('/', this.createUser.bind(this));
    router.get('/:user/meta', this.getData.bind(this));
    router.get('/:user/meta/:name', this.getVal.bind(this));
    router.get('/:username', this.getUser.bind(this));
    router.delete('/:user', this.removeUser.bind(this));
    router.post('/:user/meta/:name', this.setVal.bind(this));
    router.post('/:user/meta', this.setData.bind(this));

    // Register the path
    e.use((this._options.rootPath || '') + '/users', router);

    await super.initialize(e, db);
    return this;
  }

  /**
   * Gets a specific user by username or email - the 'username' parameter must be set. Some of the user data will be obscured unless the verbose parameter
   * is specified. Specify the verbose=true parameter in order to get all user data.
   */
  @j200()
  @hasPermission('username')
  private async getUser(req: IAuthReq, res: express.Response) {
    const user = await this._userController.getUser({
      username: req.params.username,
      verbose: req.query.verbose === 'true'
    });

    if (!user) throw new Error('No user found');

    return user;
  }

  @j200()
  @validId('id', 'ID')
  @authorize()
  private async edit(req: IAuthReq, res: express.Response) {
    const user = await this._userController.getUser({ id: req.params.id });

    if (!user) throw new Error404(`User does not exist`);
    if (!req._isAdmin && user.username !== req._user!.username) throw new Error403();

    const token = req.body as IUserEntry<'client'>;
    if (user.privileges === 'super' && (token.privileges !== undefined && token.privileges !== 'super'))
      throw new Error400('You cannot set a super admin level to less than super admin');

    return await this._userController.update(req.params.id, token, req._isAdmin ? false : true);
  }

  /**
   * Gets a list of users. You can limit the haul by specifying the 'index' and 'limit' query parameters.
   * Also specify the verbose=true parameter in order to get all user data. You can also filter usernames with the
   * search query
   */
  @j200()
  @identify()
  private async getUsers(req: IAuthReq, res: express.Response) {
    let verbose = req.query.verbose === undefined ? true : req.query.verbose === 'true';

    // Only admins are allowed to see sensitive data
    if (req._user && req._user.privileges === 'super' && verbose) verbose = true;
    else verbose = false;

    let index: number | undefined = parseInt(req.query.index);
    let limit: number | undefined = parseInt(req.query.limit);
    let query = req.query.search ? new RegExp(req.query.search) : undefined;
    index = isNaN(index) ? undefined : index;
    limit = isNaN(limit) ? undefined : limit;

    const response: Page<IUserEntry<'client' | 'expanded'>> = await this._userController.getUsers({
      index,
      limit,
      search: query,
      verbose
    });
    return response;
  }

  /**
   * Sets a user's meta data
   */
  @j200()
  @admin()
  private async setData(req: IAuthReq, res: express.Response) {
    const user = req._user!;
    let val = req.body && req.body.value;
    if (!val) val = {};

    await this._userController.setMeta(user._id, val);
    return;
  }

  /**
   * Sets a user's meta value
   */
  @j200()
  @admin()
  private async setVal(req: IAuthReq, res: express.Response) {
    const user = req._user!;
    const name = req.params.name;

    await this._userController.setMetaVal(user._id, name, req.body.value);
    return;
  }

  /**
   * Gets a user's meta value
   */
  @j200()
  @hasPermission('user')
  private async getVal(req: IAuthReq, res: express.Response) {
    const user = req._user!;
    const name = req.params.name;

    const response = await this._userController.getMetaVal(user._id, name);
    return response;
  }

  /**
   * Gets a user's meta data
   */
  @j200()
  @hasPermission('user')
  private async getData(req: IAuthReq, res: express.Response) {
    const user = req._user!;
    const response = await this._userController.getMetaData(user._id);
    return response;
  }

  /**
   * Removes a user from the database
   */
  @j200(204)
  @hasPermission('user')
  private async removeUser(req: IAuthReq, res: express.Response) {
    const toRemove = req.params.user;
    if (!toRemove) throw new Error('No user found');

    await this._userController.removeUser(toRemove);
    return;
  }

  /**
   * Allows an admin to create a new user without registration
   */
  @j200()
  @admin()
  private async createUser(req: express.Request, res: express.Response) {
    const token: Partial<IUserEntry<'client'>> = req.body;
    token.privileges = token.privileges ? token.privileges : 'regular';

    // Not allowed to create super users
    if (token.privileges === 'super') throw new Error('You cannot create a user with super admin permissions');

    const user = await this._userController.createUser(
      {
        username: token.username!,
        email: token.email!,
        password: token.password!,
        privileges: token.privileges!,
        meta: token.meta
      },
      true,
      true
    );

    return user;
  }
}

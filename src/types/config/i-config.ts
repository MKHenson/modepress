declare module 'modepress' {

  /**
   * A server configuration
   */
  export interface IConfig {

    /**
     * The folder where modepress will search for client projects to add to the runtime.
     * This setting must represent a path string. Each folder in the path will be analyzed
     * and any with a valid modepress.json will be added.
     */
    clientsFolder: string;

    /**
     * Describes each of the media buckets available to the
     * modepress servers.
     */
    remotes: {
      'google': IGoogleProperties;
      'local': ILocalBucket;
    }

    /**
     * The length of time a render is kept in the DB before being updated. Stored in seconds.
     * e.g. 86400 (1 day)
     */
    ajaxRenderExpiration: number;


    database: IDatabase;

    /**
     * If debug is true, certain functions will be emulated and more information logged
     */
    debug: boolean;

    /**
     * Settings related to sending emails
     */
    mail: IMailProperties;

    /**
     * A list of collection names
     */
    collections: ICollectionProperties;

    /**
     * Describes the session settings
     */
    sessionSettings: ISession;

    /**
     * The administrative user. This is the root user that will have access to the information in the database.
     * This can be anything you like, but try to use passwords that are hard to guess
     * eg:
     * 'adminUser': {
     *  'username': 'root',
     *  'email': 'root_email@host.com',
     *  'password': 'CHANGE_THIS_PASSWORD'
     * }
     */
    adminUser: IAdminUser;

    /**
     * Information regarding the websocket communication. Used for events and IPC
     */
    websocket: IWebsocket;
  }
}
export interface IMailProperties {
    /**
     * Specify the type of mailer to use.
     * Currently we support either 'gmail' or 'mailgun'
     */
    type: 'gmail' | 'mailgun';
    /**
     * Options to be sent to the desired mailer
     */
    options: string | IGMail | IMailgun;
}
export interface IMailOptions {
    /**
     * The from field sent to recipients
     */
    from: string;
}
export interface IMailer {
    /**
     * Attempts to initialize the mailer
     * @param {IMailOptions} options
     * @returns {Promise<boolean>}
     */
    initialize(options: IMailOptions): Promise<boolean>;
    /**
     * Sends an email
     * @param {stirng} to The email address to send the message to
     * @param {stirng} from The email we're sending from
     * @param {stirng} subject The message subject
     * @param {stirng} msg The message to be sent
     * @returns {Promise<boolean>}
     */
    sendMail(to: string, from: string, subject: string, msg: string): Promise<boolean>;
}
/**
 * Options for a gmail mailer
 */
export interface IGMail extends IMailOptions {
    apiEmail: string;
    keyFile: string;
}
/**
 * Options for a mailgun mailer
 */
export interface IMailgun extends IMailOptions {
    /**
     * The domain for associated with the mailgun account
     */
    domain: string;
    /**
     * The api key for your mailgun account
     */
    apiKey: string;
}

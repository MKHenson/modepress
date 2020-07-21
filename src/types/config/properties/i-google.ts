import { IRemoteOptions } from './i-remote-options';

/*
 * Users stores data on an external cloud volume with Google
 */
export interface IGoogleProperties extends IRemoteOptions {
  /*
   * Path to the key file
   */
  keyFile: string;

  /*
   * Project ID
   */
  projectId: string;
}

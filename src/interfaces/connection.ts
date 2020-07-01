import { ConnectionOptions } from 'tls';

/**
 * Basic connection config.
 */
export interface IConfig {
  protocol: string;
}

/**
 * Basic connection options.
 */
export interface IOptions {
  timeout?: number;
}

/**
 * Basic connection config for file transfer protocols.
 */
interface IFtpConfigBase extends IConfig {
  host: string;
  user: string;
  password: string;
  port?: number;
}

/**
 * Connection config for __ftp__ and __ftps__ protocols.
 */
export interface IFtpConfig extends IFtpConfigBase {
  protocol: 'ftp' | 'ftps';
}

/**
 * Connection options for __ftp__ and __ftps__ protocols.
 */
export interface IFtpOptions extends IOptions {
  secureOptions?: ConnectionOptions;
}

/**
 * Connection config for __sftp_ protocol_.
 */
export interface ISFtpConfig extends IFtpConfigBase {
  protocol: 'sftp';
}

/**
 * Connection options for __sftp__ protocol.
 */
export interface ISFtpOptions extends IOptions {
  tryKeyboard?: boolean;
}

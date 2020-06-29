import { ConnectionOptions } from 'tls';

export interface IConfig {
  protocol: string;
}

export interface IOptions {
  timeout?: number;
}

interface IFtpConfigBase extends IConfig {
  host: string;
  user: string;
  password: string;
  port?: number;
}

export interface IFtpConfig extends IFtpConfigBase {
  protocol: 'ftp' | 'ftps';
}

export interface ISFtpConfig extends IFtpConfigBase {
  protocol: 'sftp';
}

export interface IFtpOptions extends IOptions {
  secureOptions?: ConnectionOptions;
}

export interface ISFtpOptions extends IOptions {
  tryKeyboard?: boolean;
}

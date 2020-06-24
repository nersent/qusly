import { ConnectionOptions } from 'tls';

export type IProtocol = 'sftp' | 'ftp' | 'ftps';

export type IConfig = IFtpConfig;

export interface IConfigBase {
  protocol: IProtocol;
}

export interface IFtpConfig extends IConfigBase {
  host: string;
  user: string;
  password: string;
  port?: number;
}

export interface IFtpOptions {
  timeout?: number;
  secureOptions?: ConnectionOptions;
}

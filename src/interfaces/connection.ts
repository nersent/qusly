import { ConnectionOptions } from 'tls';

export type IProtocol = 'sftp' | 'ftp' | 'ftps';

export type IConfig = IFtpConfig | ISftpConfig;

export interface IConfigBase {
  protocol: IProtocol;
  options?: any;
}

export interface IFtpConfigBase extends IConfigBase {
  host: string;
  user: string;
  password: string;
  port?: number;
}

export interface IFtpConfig extends IFtpConfigBase {
  options?: IFtpOptions;
}

export interface ISftpConfig extends IFtpConfigBase {
  options?: ISftpOptions;
}

export interface IFtpOptions {
  timeout?: number;
  secureOptions?: ConnectionOptions;
}

export interface ISftpOptions {
  tryKeyboard?: boolean;
}

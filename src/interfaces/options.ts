import { ConnectionOptions } from 'tls';

export interface IOptions {
  sftp?: ISftpOptions;
  ftp?: IFtpOptions;
  ftps?: IFtpsOptions;
}

export interface ISftpOptions {
  tryKeyboard?: boolean;
}

export interface IFtpOptions {
  timeout?: number;
}

export interface IFtpsOptions {
  secureOptions?: ConnectionOptions;
}

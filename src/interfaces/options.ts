import { ConnectionOptions } from 'tls';

export interface IOptions {
  sftp?: ISftpOptions;
  ftp?: IFtpOptions;
  ftps?: IFtpsOptions;
}

export interface ISftpOptions {
  tryKeyboard?: boolean;
}

export interface IFtpOptions {}

export interface IFtpsOptions {
  secureOptions?: ConnectionOptions;
}

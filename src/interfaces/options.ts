export interface IOptions {
  sftp?: ISftpOptions;
  ftp?: IFtpOptions;
}

export interface ISftpOptions {
  tryKeyboard?: boolean;
}

export interface IFtpOptions {}

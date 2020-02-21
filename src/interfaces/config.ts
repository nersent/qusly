export type IProtocol = 'sftp' | 'ftp' | 'ftps';

export interface IConfig {
  protocol: IProtocol;
  host: string;
  user: string;
  password: string;
  port?: number;
  tryKeyboard?: boolean;
}

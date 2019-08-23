export type IProtocol = 'sftp' | 'ftp' | 'ftps';

export interface IConfig {
  protocol?: IProtocol;
  host: string;
  port?: number;
  user?: string;
  password?: string;
}

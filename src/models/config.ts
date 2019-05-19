export type IProtocol = 'ftp' | 'sftp';

export interface IConfig {
  protocol?: IProtocol;
  host: string;
  port?: number;
  user?: string;
  password?: string;
}

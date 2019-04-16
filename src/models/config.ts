export type IProtocol = 'ftp' | 'sftp';

export interface IConnectionConfig {
  protocol?: IProtocol;
  host: string;
  port?: number;
  user?: string;
  password?: string;
}
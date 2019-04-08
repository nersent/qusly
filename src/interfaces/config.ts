export interface IConfig {
  protocol?: 'ftp' | 'sftp';
  host: string;
  port?: number;
  user?: string;
  password?: string;
}
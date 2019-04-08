export interface IConfig {
  protocol?: 'ftp' | 'sftp';
  host: string;
  port?: number;
  username?: string;
  password?: string;
}
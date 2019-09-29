import { Client } from '../models';

export interface ITransferOptions {
  quiet?: boolean;
}

export interface IDownloadOptions extends ITransferOptions {
  startAt?: number;
}

export interface IProgress {
  chunkSize?: number;
  buffered?: number;
  size?: number;
  localPath?: string;
  remotePath?: string;
  eta?: number;
  speed?: number;
  startAt?: Date;
  context?: Client;
}

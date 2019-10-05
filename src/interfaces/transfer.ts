import { Client } from '../models';

export type ITransferType = 'download' | 'upload';

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

export interface ITransferClientNew {
  id?: string;
  type?: ITransferType;
  localPath?: string;
  remotePath?: string;
  context?: Client;
}

export interface ITransferClientProgress extends IProgress {
  id?: string;
  type?: ITransferType;
}

import { Client } from '../models';

export interface ITransferOptions {
  quiet?: boolean;
}

export interface IDownloadOptions extends ITransferOptions {
  startAt?: number;
}

export type ITransferStatus = 'finished' | 'aborted' | 'closed';

export type ITransferType = 'download' | 'upload';

// export interface IProgress {
//   chunkSize?: number;
//   buffered?: number;
//   size?: number;
//   localPath?: string;
//   remotePath?: string;
//   eta?: number;
//   speed?: number;
//   percent?: number;
//   startAt?: Date;
//   context?: any; //Client;
// }

// export interface ITransferItem {
//   id?: string;
//   type?: ITransferType;
//   status?: ITransferStatus;
//   data?: any;
//   info?: IProgress;
// }

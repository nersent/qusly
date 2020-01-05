import { Client } from '../models';

export type ITransferStatus = 'finished' | 'aborted' | 'closed';

export type ITransferType = 'download' | 'upload';

export interface ITransferOptions {
  /**If it's set to `true`, it will prevent `progress` event from emitting*/
  quiet?: boolean;
  /**Offset in `bytes` to start uploading from. __Works only with downloading!__*/
  startAt?: number;
}

export interface IProgressEvent {
  /**Type of a transfer*/
  type: ITransferType;
  /**Transferred `bytes`*/
  buffered?: number;
  /**Size of a file in `bytes`*/
  size?: number;
  /**Path of the local file*/
  localPath?: string;
  /**Path of the remote file*/
  remotePath?: string;
  /**Estimated time arrival in `seconds`*/
  eta?: number;
  /**Speed of a transfer in `MB/s`*/
  speed?: number;
  /**Progress of a transfer in `%`*/
  percent?: number;
  /**Date when a transfer started*/
  startAt?: Date;
  /**An instance of `Client`*/
  context?: Client;
}

import { Client } from '../models';

export type ITransferStatus = 'finished' | 'aborted' | 'closed';

export type ITransferType = 'download' | 'upload';

export type IConcurrentTransferStatus =
  | 'pending'
  | 'transfering'
  | ITransferStatus;

export interface ITransferOptions {
  /**If set to `true`, will prevent emitting `progress` event.*/
  quiet?: boolean;
  /**Offset in `bytes` to start uploading from.*/
  startAt?: number;
}

export interface ITransferInfo {
  /**Type of the transfer.*/
  type: ITransferType;
  /**Path to a local file.*/
  localPath: string;
  /**Path to a remote file.*/
  remotePath: string;
  /**Date when the transfer has started.*/
  startAt: Date;
  /**Instance of `Client`.*/
  context: Client;
}

export interface ITransferProgress {
  /**Sent bytes.*/
  buffered: number;
  /**Estimated time arrival in `seconds`.*/
  eta: number;
  /**Speed of the transfer in `MB/s`.*/
  speed: number;
  /**Progress of the transfer in `%`.*/
  percent: number;
  /**Size of the file in `bytes`.*/
  size: number;
}

export type IConcurrentTransferInfo = Omit<
  ITransferInfo,
  'context' | 'startAt'
> & {
  /**Unique id of the transfer.*/
  id: string;
  /**Status of the transfer.*/
  status: IConcurrentTransferStatus;
};

import { Client } from '../models';

export type ITransferStatus = 'finished' | 'aborted' | 'closed';

export type ITransferType = 'download' | 'upload';

export type IParallelTransferStatus = 'pending' | 'transfering' | ITransferStatus;

export interface ITransferOptions {
  /**If it's set to `true`, it will prevent `progress` event from emitting*/
  quiet?: boolean;
  /**Offset in `bytes` to start uploading from. __Works only with downloading!__*/
  startAt?: number;
}

export interface ITransferInfo {
  /**Type of the transfer*/
  type: ITransferType;
  /**Path of the local file*/
  localPath: string;
  /**Path of the remote file*/
  remotePath: string;
  /**Date when the transfer started*/
  startAt: Date;
  /**Instance of `Client`*/
  context: Client;
}

export interface ITransferProgress {
  /**Sent bytes*/
  buffered: number;
  /**Estimated time arrival in `seconds`*/
  eta: number;
  /**Speed of the transfer in `MB/s`*/
  speed: number;
  /**Progress of the transfer in `%`*/
  percent: number;
  /**Size of the file in `bytes`*/
  size: number;
}

export type IParallelTransferInfo = Omit<ITransferInfo, 'context' | 'startAt'> & {
  /**Unique id of the transfer*/
  id: string;
  /**Status of the transfer*/
  status: IParallelTransferStatus;
}

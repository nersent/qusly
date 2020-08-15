/**
 * Basic transfer info.
 */
export interface ITransfer extends ITransferDirection {
  id?: number;
}

/**
 * Transfer directions.
 */
export interface ITransferDirection {
  remotePath?: string;
  localPath?: string;
}

/**
 * Used for preparing a new transfer in `Strategy`.
 */
export interface ITransferInfo extends ITransfer {
  startAt?: number;
  totalBytes?: number;
}

export interface ITransferOptions {
  /**Determinates, if progress listener will be emitted. */
  quiet?: boolean;
}

/**
 * Network info about the transfer.
 */
export interface ITransferProgress {
  bytes?: number;
  totalBytes?: number;
  /**Estimated time arrival in `seconds`.*/
  eta?: number;
  /**Speed in bytes per second.*/
  speed?: number;
  percent?: number;
}

export type ITransferProgressListener = (
  transfer: ITransfer,
  progress: ITransferProgress,
) => void;

export type ITransferListener = (bytes: number) => void;

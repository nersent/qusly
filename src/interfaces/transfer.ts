export interface ITransfer {
  id?: number;
  remotePath?: string;
  localPath?: string;
}

export interface ITransferProgress {
  bytes?: number;
  totalBytes?: number;
  /**Estimated time arrival in `seconds`.*/
  eta?: number;
  /**Speed in `MB/s`.*/
  speed?: number;
  /**Progress in `%`.*/
  percent?: number;
}

export type IProgressEventListener = (
  transfer: ITransfer,
  progress: ITransferProgress,
) => void;

export interface ITransferOptions {
  id?: number;
  startAt?: number;
  quiet?: boolean;
}

export interface ITransferRequestInfo {
  totalBytes?: number;
  localPath?: string;
  remotePath?: string;
}

export interface ITransfer extends ITransferDirectory {
  id?: number;
}

export interface ITransferDirectory {
  remotePath?: string;
  localPath?: string;
}

export interface ITransferInfo extends ITransferDirectory {
  id?: number;
  startAt?: number;
  totalBytes?: number;
}

export interface ITransferOptions {
  quiet?: boolean;
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

export type ITransferProgressListener = (
  transfer: ITransfer,
  progress: ITransferProgress,
) => void;

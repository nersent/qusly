export interface IProgressEvent {
  id?: number;
  bytes?: number;
  totalBytes?: number;
  /**Estimated time arrival in `seconds`.*/
  eta?: number;
  /**Speed in `MB/s`.*/
  speed?: number;
  /**Progress in `%`.*/
  percent?: number;
  remotePath?: string;
  localPath?: string;
}

export interface ITransferOptions {
  id?: number;
  startAt?: number;
  quiet?: boolean;
}

export interface ITransferInfo {
  totalBytes?: number;
  localPath?: string;
  remotePath?: string;
}

export interface ITransferInfo {
  bytes?: number;
  totalBytes?: number;
  quiet?: boolean;
  remotePath: string;
}

export interface ITransferProgress {
  bytes: number;
  totalBytes: number;
  /**Estimated time arrival in `seconds`.*/
  eta: number;
  /**Speed in `MB/s`.*/
  speed: number;
  /**Progress in `%`.*/
  percent: number;
  remotePath: string;
}

export interface ITransferBasicInfo {
  totalBytes?: number;
  remotePath?: string;
  localPath?: string;
}

export interface ITransferInfo extends ITransferBasicInfo {
  bytes?: number;
  quiet?: boolean;
}

export interface ITransferProgress extends ITransferBasicInfo {
  bytes: number;
  /**Estimated time arrival in `seconds`.*/
  eta: number;
  /**Speed in `MB/s`.*/
  speed: number;
  /**Progress in `%`.*/
  percent: number;
}

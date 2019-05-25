export interface ITransferData {
  type?: 'download' | 'upload';
  size?: number;
  path?: string;
  startAt?: number;
}

export interface IStreamInfo extends ITransferData {
  blockProgress?: boolean;
}

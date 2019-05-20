export interface IStreamInfo {
  type?: 'download' | 'upload';
  size?: number;
  path?: string;
  startAt?: number;
}

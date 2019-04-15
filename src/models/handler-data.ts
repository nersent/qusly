export interface IHandlerData {
  type: 'download' | 'upload';
  fileSize: number;
  path: string;
  startAt?: number;
}
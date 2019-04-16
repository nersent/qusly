export interface IHandler {
  type: 'download' | 'upload';
  fileSize: number;
  path: string;
  startAt?: number;
}
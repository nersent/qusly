export interface IProgressEvent {
  type: 'download' | 'upload';
  path: string;
  bytes: number;
  fileSize?: number;
}
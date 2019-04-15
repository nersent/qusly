export interface IProgressEventData {
  type: 'download' | 'upload';
  path: string;
  bytes: number;
  fileSize: number;
}
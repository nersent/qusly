export interface IProgressEventData {
  bytes: number;
  size: number;
  type: 'download' | 'upload';
}

export type IProgressEvent = (data: IProgressEventData) => void;
import { ITransferData } from './stream';

export interface IProgressEvent extends ITransferData {
  bytes: number;
}

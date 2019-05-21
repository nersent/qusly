import { ITransferData } from "./stream-info";

export interface IProgressEvent extends ITransferData {
  bytes: number;
}

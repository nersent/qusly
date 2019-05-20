import { IStreamInfo } from "./stream-info";

export interface IProgressEvent extends IStreamInfo {
  bytes: number;
}

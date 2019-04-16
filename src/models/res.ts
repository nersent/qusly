import { File } from "./file";

export interface IResponse {
  success: boolean;
  error?: {
    code?: string | number;
    message?: string;
  }
}

export interface ISizeResponse extends IResponse {
  value?: number;
}

export interface IAbortResponse extends IResponse {
  bytes?: number;
}

export interface IExecResponse extends IResponse {
  message?: string;
}

export interface ILsResponse extends IResponse {
  files?: File[];
}
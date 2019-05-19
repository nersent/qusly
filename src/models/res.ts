import { IFile } from "./file";

export interface IRes {
  success: boolean;
  error?: Error;
}

export interface ISizeRes extends IRes {
  size?: number;
}

export interface ISendRes extends IRes {
  message?: string;
}

export interface IPwdRes extends IRes {
  path?: string;
}

export interface IReadDirRes extends IRes {
  files?: IFile[];
}

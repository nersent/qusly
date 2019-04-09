import { IFileAttributes } from "./attributes";

export interface IFile {
  type: 'file' | 'folder';
  name: string;
  longname: string;
  attrs: IFileAttributes;
}
export interface IFile {
  name: string;
  type: IFileType;
  size: number;
  owner: string;
  group: string;
  mtime: Date;
}

export enum IFileType {
  Unknown = 0,
  File,
  Directory,
  SymbolicLink
}
export enum FileType {
  Unknown = 0,
  File,
  Directory,
  SymbolicLink
}

export interface File {
  name: string;
  type: FileType;
  size: number;
  user: string;
  group: string;
  date: Date;
  permissions: {
    user: number;
    group: number;
  }
}
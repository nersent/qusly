export type IFileType = 'unknown' | 'file' | 'folder' | 'symbolic-link';

export interface IFile {
  /**Full name of the file.*/
  name?: string;
  type?: IFileType;
  /**Size of the file in bytes.*/
  size?: number;
  owner?: string;
  group?: string;
  lastModified?: Date;
  /**Not guaranteed.*/
  permissions?: IFilePermissions;
}

export interface IFilePermissions {
  owner?: number;
  group?: number;
}

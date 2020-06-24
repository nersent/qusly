export type IFileType = 'unknown' | 'file' | 'folder' | 'symbolic-link';

export interface IFile {
  name?: string;
  type?: IFileType;
  /**Size in bytes*/
  size?: number;
  owner?: string;
  group?: string;
  lastModified?: Date;
  permissions?: IFilePermissions;
}

export interface IFilePermissions {
  owner?: number;
  group?: number;
}

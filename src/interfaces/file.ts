export type IFileType = 'unknown' | 'file' | 'folder' | 'symbolic-link';

export interface IFile {
  name?: string;
  type?: IFileType;
  size?: number;
  user?: string;
  group?: string;
  date?: Date;
  ext?: string;
  permissions?: {
    user?: number;
    group?: number;
  }
}

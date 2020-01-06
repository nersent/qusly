export type IFileType = 'unknown' | 'file' | 'folder' | 'symbolic-link';

export interface IFile {
  /**Name of the file.*/
  name: string;
  /**Type of the file.*/
  type: IFileType;
  /**Size of the file in `bytes`.*/
  size: number;
  /**Owner of the file.*/
  user: string;
  /**Group of the file.*/
  group: string;
  /**Last modified time of the file.*/
  date: Date;
  /**Extension of the file.*/
  ext: string;
  /**Permissions of the file. Only in Unix.*/
  permissions: {
    user: number;
    group: number;
  }
}

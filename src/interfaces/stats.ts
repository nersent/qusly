import { IFileType } from './file';

export interface IStats {
  /**Size of the file in `bytes`.*/
  size?: number;
  /**Type of the file.*/
  type?: IFileType;
}

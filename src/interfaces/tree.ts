import { IFile } from './file';

export interface ITreeOptions {
  path?: string;
  maxDepth?: number;
  filter?: (item: ITreeItem) => boolean;
}

export interface ITreeItem {
  path?: string;
  file?: IFile;
}

import { IFile } from './file';

export interface ITraversalItem {
  path?: string;
  file?: IFile;
}

export interface ITraversalOptions {
  path?: string;
  maxDepth?: number;
  filter?: (item: ITraversalItem) => boolean;
}

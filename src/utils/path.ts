import { IFile } from '../interfaces';

export const formatPath = (path: string, file: IFile) => {
  return `${path !== '/' ? path : ''}/${file.name.trim()}`;
}

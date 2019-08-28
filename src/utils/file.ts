import { FileInfo, FileType } from 'basic-ftp';
import { extname } from 'path';

import { IFile, IFileType } from '../interfaces';

const getType = (type: FileType): IFileType => {
  switch (type) {
    case FileType.Directory: {
      return 'directory';
    }
    case FileType.File: {
      return 'file';
    }
    case FileType.SymbolicLink: {
      return 'symbolic-link';
    }
    case FileType.Unknown: {
      return 'unknown';
    }
  }
}

export const formatFile = (file: FileInfo): IFile => {
  return {
    date: new Date(file.date),
    permissions: {
      user: file.permissions.user,
      group: file.permissions.group,
    },
    name: file.name,
    size: file.size,
    user: file.user,
    group: file.group,
    type: getType(file.type),
    ext: extname(file.name),
  };
}

export const createFileName = (files: IFile[], prefix: string) => {
  let exists = false;
  let index = 1;

  files.forEach(file => {
    const name = file.name.toLowerCase();

    if (name.startsWith(prefix)) {
      exists = true;

      const matches = name.match(/\(([^)]+)\)/);

      if (matches != null) {
        const fileIndex = parseInt(matches[1], 10);

        if (fileIndex > index) {
          index = fileIndex;
        }
      }
    }
  });

  return exists ? `${prefix} (${index + 1})` : prefix;
};

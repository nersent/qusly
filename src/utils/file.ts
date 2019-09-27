import { extname } from 'path';
import { FileInfo, FileType } from 'basic-ftp';

import { IFile, IFileType } from '../interfaces';

const getType = (type: FileType): IFileType => {
  switch (type) {
    case FileType.Directory: {
      return 'folder';
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
  const { date, permissions, name, size, user, group, type } = file;

  return {
    date: new Date(date),
    permissions: {
      user: permissions.user,
      group: permissions.group,
    },
    type: getType(type),
    ext: extname(name),
    name,
    size,
    user,
    group,
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

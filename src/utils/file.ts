import { Readable, Writable } from 'stream';
import { extname } from 'path';
import { FileInfo, FileType } from 'basic-ftp';
import { Stats, FileEntry } from 'ssh2-streams';
import { promises as fs } from 'fs';

import { IFile, IFileType } from '../interfaces';
import { getValidDate } from './string';
import { convertUnixTimestamp } from './date';

export const getFileType = (type: FileType): IFileType => {
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
  }

  return 'unknown';
};

export const getFileTypeFromStats = (stats: Stats): IFileType => {
  if (stats.isDirectory()) {
    return 'folder';
  } else if (stats.isFile()) {
    return 'file';
  } else if (stats.isSymbolicLink()) {
    return 'symbolic-link';
  }

  return 'unknown';
};

export const formatFile = (file: FileInfo): IFile => {
  const { permissions, name, size, user, group, type } = file;

  return {
    permissions: {
      user: permissions?.user,
      group: permissions?.group,
    },
    type: getFileType(type),
    ext: extname(name),
    name,
    size,
    user,
    group,
  };
};

export const formatFtpFile = (file: FileInfo): IFile => {
  const { date } = file;
  const parsed = formatFile(file);

  return {
    ...parsed,
    date: getValidDate(date),
  };
};

export const formatSftpFile = (file: FileInfo, entry: FileEntry): IFile => {
  const parsed = formatFile(file);
  const { mtime } = entry.attrs;

  return {
    ...parsed,
    date: convertUnixTimestamp(mtime),
  };
};

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

export const getFilePath = (stream: Readable | Writable) => {
  return (stream as any).path;
};

export const getFileSize = async (source: Readable) => {
  const path = getFilePath(source);
  if (!path) return -1;

  const { size } = await fs.stat(path);
  return size;
};

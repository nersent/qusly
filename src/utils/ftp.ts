import { FileInfo, FileType } from 'basic-ftp';

import { IFile, IFileType } from '~/interfaces/file';

const MSDOS_DATE_REGEX = /[0-9][0-9]-[0-9][0-9]-[0-9][0-9]\s[0-9][0-9]\:[0-9][0-9][PA]M/gi;

export class FtpUtils {
  public static formatFile(file: FileInfo): IFile {
    const { permissions, name, size, user, group, type } = file;

    return {
      name,
      type: this.getFileType(type),
      size,
      owner: user,
      group,
      permissions: {
        owner: permissions?.user,
        group: permissions?.group,
      },
    };
  }

  public static getFileType(type: FileType): IFileType {
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
  }

  public static getValidDate(str: string) {
    const date = str.trim();

    const match = date.match(MSDOS_DATE_REGEX);

    if (!match) {
      return new Date(date);
    }

    const [month, day, year, _hour, minutes] = date.match(/[0-9][0-9]/g);

    let hour = parseInt(_hour);

    if (date[date.length - 2] === 'P') {
      hour += 12;
    }

    return new Date(
      parseInt(`20${year}`),
      parseInt(month) - 1,
      parseInt(day),
      hour,
      parseInt(minutes),
    );
  }
}

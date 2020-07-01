import 'mocha';
import { createReadStream, createWriteStream, writeFileSync } from 'fs';
import { expect } from 'chai';
import { FileInfo, FileType } from 'basic-ftp';

import { repeat } from '../src/utils/array';
import { getPathFromStream, getFileSize } from '../src/utils/file';
import { IFile, IFileType, ITaskResponse } from '../src/interfaces';
import { FtpUtils } from '../src/utils/ftp';
import { execFunction } from '../src/utils/function';

import { getTempFilePath } from './utils/file';

describe('Utils', () => {
  describe('Array', () => {
    describe('repeat()', () => {
      it('returns an array filled with the same values', () => {
        const value = 'value';
        const length = 2;

        const res = repeat(value, length);

        expect(res.length).equals(length);
        expect(res).eqls([value, value]);
      });
    });
  });

  describe('File', () => {
    describe('getPathFromStream()', () => {
      it('returns path of a file', () => {
        const path = getTempFilePath();

        const writable = createWriteStream(path);
        const readable = createReadStream(path);

        const rRes = getPathFromStream(readable);
        const wRes = getPathFromStream(writable);

        expect(rRes).equals(path);
        expect(wRes).equals(path);
      });
    });

    describe('getFileSize()', () => {
      it('returns -1 if path is not given', async () => {
        const res = await getFileSize(undefined);

        expect(res).equals(-1);
      });

      it('returns size of a file', async () => {
        const path = getTempFilePath();

        writeFileSync(path, '');

        const res = await getFileSize(path);

        expect(res).to.be.a('number');
        expect(res).to.be.greaterThan(-1);
      });
    });
  });

  describe('FtpUtils', () => {
    describe('formatFile()', () => {
      it('formats raw file info', () => {
        const modifiedAt = '2020-06-29T20:34:30.000Z';

        const file: IFile = FtpUtils.formatFile({
          name: 'video.mp4',
          type: 1,
          size: 4800,
          rawModifiedAt: modifiedAt,
          modifiedAt: new Date(modifiedAt),
          permissions: { user: 6, group: 6, world: 4 },
          hardLinkCount: undefined,
          link: undefined,
          group: '16',
          user: '1355409',
          uniqueID: '803g35a054a',
        } as FileInfo);

        expect(file).eqls({
          name: 'video.mp4',
          type: 'file',
          size: 4800,
          owner: '1355409',
          group: '16',
          permissions: { owner: 6, group: 6 },
        } as IFile);

        expect(file.lastModified).equals(undefined);
      });
    });

    describe('getFileType()', () => {
      it('returns type of a file', () => {
        expect(FtpUtils.getFileType(FileType.Directory)).equals(
          'folder' as IFileType,
        );

        expect(FtpUtils.getFileType(FileType.File)).equals('file' as IFileType);

        expect(FtpUtils.getFileType(FileType.SymbolicLink)).equals(
          'symbolic-link' as IFileType,
        );

        expect(FtpUtils.getFileType(FileType.Unknown)).equals(
          'unknown' as IFileType,
        );
      });
    });

    describe('getValidDate()', () => {
      it('supports js date format', () => {
        const date = new Date().toUTCString();
        const res = FtpUtils.getValidDate(date);

        expect(res.toUTCString()).equals(date);
      });

      it('supports ms-dos format (AM)', () => {
        const res = FtpUtils.getValidDate('12-01-05 06:02AM');

        expect(res.getFullYear()).equals(2005);
        expect(res.getMonth()).equals(11);
        expect(res.getDate()).equals(1);

        expect(res.getHours()).equals(6);
        expect(res.getMinutes()).equals(2);
      });

      it('supports ms-dos format (PM)', () => {
        const res = FtpUtils.getValidDate('08-11-19 02:46PM');

        expect(res.getFullYear()).equals(2019);
        expect(res.getMonth()).equals(7);
        expect(res.getDate()).equals(11);

        expect(res.getHours()).equals(14);
        expect(res.getMinutes()).equals(46);
      });
    });

    describe('getDateFromUnixTime()', () => {
      it('returns a date object', () => {
        const res = FtpUtils.getDateFromUnixTime(1593529571);

        expect(res.toUTCString()).equals('Tue, 30 Jun 2020 15:06:11 GMT');
      });
    });
  });

  describe('Function', () => {
    describe('execFunction()', () => {
      it('returns value with no error', async () => {
        const res: ITaskResponse = await execFunction(() => 'value');

        expect(res?.data).equals('value');
        expect(res?.error).equals(undefined);
      });

      it('returns error', async () => {
        const res: ITaskResponse = await execFunction(() => {
          throw new Error('test');
        });

        expect(res?.data).equals(undefined);
        expect(res?.error).to.be.an('error');
      });
    });
  });
});

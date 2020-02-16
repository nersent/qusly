import * as sinon from 'sinon';
import { expect } from 'chai';
import 'mocha';
import { FileInfo, FileType } from 'basic-ftp';
import { Stats, FileEntry } from 'ssh2-streams';
import { promises as fs } from 'fs';

import { IFile } from '../../src/interfaces';
import * as stringUtils from '../../src/utils/string';
import * as fileUtils from '../../src/utils/file';
import * as dateUtils from '../../src/utils/date';

const FILE_INFO_EXAMPLE = ({
  permissions: {
    group: 1010,
    user: 2020,
  } as any,
  size: 4096,
  user: 'user',
  group: 'root',
  name: 'video.mp4',
  type: FileType.File,
} as any) as FileInfo;

describe('File utils', () => {
  describe('getFileType', () => {
    it('returns folder', () => {
      const res = fileUtils.getFileType(FileType.Directory);

      expect(res).equals('folder');
    });

    it('returns file', () => {
      const res = fileUtils.getFileType(FileType.File);

      expect(res).equals('file');
    });

    it('returns symbolic link', () => {
      const res = fileUtils.getFileType(FileType.SymbolicLink);

      expect(res).equals('symbolic-link');
    });

    it('returns unknown', () => {
      const res = fileUtils.getFileType(FileType.Unknown);

      expect(res).equals('unknown');
    });
  });

  describe('getFileTypeFromStats', () => {
    const stats: Partial<Stats> = {
      isDirectory: () => false,
      isFile: () => false,
      isSymbolicLink: () => false,
    };

    it('returns folder', () => {
      const res = fileUtils.getFileTypeFromStats({
        ...stats,
        isDirectory: () => true,
      } as any);

      expect(res).equals('folder');
    });

    it('returns file', () => {
      const res = fileUtils.getFileTypeFromStats({
        ...stats,
        isFile: () => true,
      } as any);

      expect(res).equals('file');
    });

    it('returns symbolic link', () => {
      const res = fileUtils.getFileTypeFromStats({
        ...stats,
        isSymbolicLink: () => true,
      } as any);

      expect(res).equals('symbolic-link');
    });

    it('returns unknown', () => {
      const res = fileUtils.getFileTypeFromStats(stats as any);

      expect(res).equals('unknown');
    });
  });

  describe('formatFile', () => {
    const sandbox = sinon.createSandbox();

    afterEach(sandbox.restore);

    it('formats file', () => {
      const res = fileUtils.formatFile(FILE_INFO_EXAMPLE as FileInfo);

      expect(res).deep.equal({
        ...FILE_INFO_EXAMPLE,
        type: 'file',
        ext: '.mp4',
      });
    });

    it('formats file type', () => {
      const stub = sandbox.stub(fileUtils, 'getFileType');

      fileUtils.formatFile(FILE_INFO_EXAMPLE as FileInfo);

      expect(stub.calledOnceWith(FILE_INFO_EXAMPLE.type)).equals(true);
    });
  });

  describe('formatFtpFile', () => {
    const sandbox = sinon.createSandbox();

    afterEach(sandbox.restore);

    const dateStr = '2020-01-01T18:10:38.000Z';

    const fileInfo = {
      ...FILE_INFO_EXAMPLE,
      date: dateStr,
    };

    it('formats file', () => {
      const stub = sandbox.stub(fileUtils, 'formatFile');

      fileUtils.formatFile(fileInfo as any);

      expect(stub.calledOnceWith(fileInfo as any)).equals(true);
    });

    it('formats date', () => {
      const spy = sandbox.spy(stringUtils, 'getValidDate');

      const res = fileUtils.formatFtpFile(fileInfo as any);

      expect(res.date.toString()).equals(new Date(dateStr).toString());
      expect(spy.calledOnceWith(dateStr)).equals(true);
    });
  });

  describe('formatSftpFile', () => {
    const sandbox = sinon.createSandbox();

    afterEach(sandbox.restore);

    it('formats file', () => {
      const stub = sandbox.stub(fileUtils, 'formatFile');

      fileUtils.formatFile(FILE_INFO_EXAMPLE);

      expect(stub.calledOnceWith(FILE_INFO_EXAMPLE)).equals(true);
    });

    it('formats date', () => {
      const spy = sandbox.spy(dateUtils, 'convertUnixTimestamp');

      const mtime = 1581873649;
      const date = new Date(mtime * 1000);

      const entry = {
        attrs: {
          mtime,
        },
      };

      const res = fileUtils.formatSftpFile(FILE_INFO_EXAMPLE, entry as any);

      expect(res.date.toString()).equals(date.toString());
      expect(spy.calledOnceWith(mtime)).equals(true);
    });
  });

  describe('createFileName', () => {
    const files: IFile[] = [];
    const prefix = 'new';

    it('returns unique file name', () => {
      const name = fileUtils.createFileName(files, prefix);

      files.push({ name });

      const secondName = fileUtils.createFileName(files, prefix);

      files.push({ name: secondName });

      const thirdName = fileUtils.createFileName(files, prefix);

      expect(name).equals(prefix);
      expect(secondName).equals(`${prefix} (2)`);
      expect(thirdName).equals(`${prefix} (3)`);
    });
  });

  describe('createFileName', () => {
    it('returns unique file name', () => {
      const files: IFile[] = [];
      const prefix = 'new';

      const name = fileUtils.createFileName(files, prefix);

      files.push({ name });

      const secondName = fileUtils.createFileName(files, prefix);

      files.push({ name: secondName });

      const thirdName = fileUtils.createFileName(files, prefix);

      expect(name).equals(prefix);
      expect(secondName).equals(`${prefix} (2)`);
      expect(thirdName).equals(`${prefix} (3)`);
    });
  });

  describe('getFilePath', () => {
    it('returns path', () => {
      const stream = { path: '/var/www/video.mp4' };
      const path = fileUtils.getFilePath(stream as any);

      expect(path).equals(stream.path);
    });
  });

  describe('getFileSize', () => {
    const path = '/var/www/video.mp4';
    const stream = { path };

    const sandbox = sinon.createSandbox();

    afterEach(sandbox.restore);

    it('returns size', async () => {
      const fileSize = 2048;
      const stub = sandbox.stub(fs, 'stat').returns({ size: fileSize } as any);
      const size = await fileUtils.getFileSize(stream as any);

      expect(size).equals(fileSize);
    });

    it('gets file path', async () => {
      sandbox.stub(fs, 'stat').returns({} as any);

      const stub = sandbox.stub(fileUtils, 'getFilePath').returns(path);

      await fileUtils.getFileSize(stream as any);

      expect(stub.calledOnceWith(stream as any)).equals(true);
    });

    it('gets file stats', async () => {
      const stub = sandbox.stub(fs, 'stat').returns({} as any);

      await fileUtils.getFileSize(stream as any);

      expect(stub.calledOnceWith(path)).equals(true);
    });

    it("returns -1 if stream does't have path", async () => {
      const size = await fileUtils.getFileSize({} as any);

      expect(size).equals(-1);
    });
  });
});

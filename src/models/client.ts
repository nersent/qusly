import { Writable, Readable } from 'stream';
import { EventEmitter } from 'events';
import { Client as FtpClient, parseList } from 'basic-ftp';

import { IConfig, IProtocol, IFile, IStats, IDownloadOptions, ITransferOptions, IProgress } from '../interfaces';
import { formatFile, getFileTypeFromStats, getFileType, createFileName } from '../utils';
import { TaskManager } from './task-manager';
import { SftpClient } from './sftp-client';
import { TransferManager } from './transfer-manager';

export declare interface Client {
  on(event: 'connect', listener: Function): this;
  on(event: 'disconnect', listener: Function): this;
  on(event: 'abort', listener: Function): this;
  on(event: 'progress', listener: (data?: IProgress) => void): this;
  on(event: 'pause', listener: Function): this;
  on(event: 'resume', listener: Function): this;
  once(event: 'connect', listener: Function): this;
  once(event: 'disconnect', listener: Function): this;
  once(event: 'abort', listener: Function): this;
  once(event: 'progress', listener: Function): this;
  once(event: 'pause', listener: Function): this;
  once(event: 'resume', listener: Function): this;
}

export class Client extends EventEmitter {
  public connected = false;

  public config: IConfig;

  public _ftpClient: FtpClient;

  public _sftpClient: SftpClient;

  protected _tasks = new TaskManager();

  protected _transfer = new TransferManager(this);

  public aborting = false;

  public paused = false;

  public async connect(config: IConfig): Promise<void> {
    this.config = config;
    this.connected = false;

    if (this.isSftp) {
      this._sftpClient = new SftpClient();

      await this._sftpClient.connect(config);
    } else {
      this._ftpClient = new FtpClient();

      const ftps = config.protocol === 'ftps';

      await this._ftpClient.access({
        secure: ftps,
        secureOptions: ftps ? null : {
          rejectUnauthorized: false,
        },
        ...config
      });
    }

    this.connected = true;
    this.emit('connect');
  }

  public async disconnect() {
    if (!this.connected) return;

    this.connected = false;
    console.log('before');
    await this._transfer.clean(this.aborting);
    console.log(new Date());

    if (this.isSftp) {
      this._sftpClient.disconnect();
    } else {
      this._ftpClient.close();
    }

    this._sftpClient = null;
    this._ftpClient = null;

    if (!this.aborting) {
      this.emit('disconnect');
    }
  }

  public async abort(): Promise<number> {
    if (!this.aborting) {
      this._transfer.emit('abort');
      this.aborting = true;

      await this.disconnect();
      console.log("XDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD");

      await this.connect(this.config);

      this.aborting = false;


      this.emit('abort');
      return this._transfer._buffered;
    }

    return null;
  }

  public async readDir(path?: string): Promise<IFile[]> {
    return this._tasks.handle(async () => {
      if (this.isSftp) {
        const list = await this._sftpClient.readDir(path || './');
        return list.map(file => formatFile(parseList(file.longname)[0]));
      } else {
        const list = await this._ftpClient.list(path);
        return list.map(file => formatFile(file));
      }
    });
  }

  public size(path: string): Promise<number> {
    return this._tasks.handle(() => {
      if (this.isSftp) {
        return this._sftpClient.size(path);
      }

      return this._ftpClient.size(path);
    });
  }

  public move(srcPath: string, destPath: string): Promise<void> {
    return this._tasks.handle(() => {
      if (this.isSftp) {
        return this._sftpClient.move(srcPath, destPath);
      }

      return this._ftpClient.rename(srcPath, destPath);
    });
  }

  public stat(path: string): Promise<IStats> {
    return this._tasks.handle(async (): Promise<IStats> => {
      if (this.isSftp) {
        const stats = await this._sftpClient.stat(path);
        const type = getFileTypeFromStats(stats);

        return { type, size: stats.size };
      } else {
        const list = await this._ftpClient.list(path);
        const file = list[0];
        const type = getFileType(file.type);

        return { type, size: file.size };
      }
    });
  }

  /**
   * Removes a file.
   */
  public unlink(path: string): Promise<void> {
    return this._tasks.handle(() => {
      if (this.isSftp) {
        return this._sftpClient.unlink(path);
      }

      return this._ftpClient.remove(path);
    });
  }

  /**
   * Removes a folder and all of its content.
   */
  public async rimraf(path: string): Promise<void> {
    return this._tasks.handle(() => {
      if (this.isSftp) {
        return this._sftpClient.removeDir(path);
      }

      return this._ftpClient.removeDir(path);
    });
  }

  /**
   * Removes files and folders
   */
  public async delete(path: string): Promise<void> {
    const { type } = await this.stat(path);

    if (type === 'folder') {
      return this.rimraf(path);
    }

    return this.unlink(path);
  }

  public mkdir(path: string): Promise<void> {
    return this._tasks.handle(() => {
      if (this.isSftp) {
        return this._sftpClient.mkdir(path);
      }

      return this._ftpClient.send("MKD " + path);
    });
  };

  /**
   * Returns path of current working directory.
   */
  public pwd(): Promise<string> {
    return this._tasks.handle(() => {
      if (this.isSftp) {
        return this._sftpClient.pwd();
      }

      return this._ftpClient.pwd();
    });
  }

  public async exists(path: string): Promise<boolean> {
    try {
      if (this.isSftp) {
        await this._sftpClient.stat(path);
      } else {
        await this._ftpClient.rename(path, path);
      }
    } catch (err) {
      return false;
    }

    return true;
  }

  /**
    * Sends a raw command. **Output depends on a protocol and server support!**
    */
  public send(command: string): Promise<string> {
    return this._tasks.handle(async () => {
      if (this.isSftp) {
        return this._sftpClient.send(command);
      } else {
        const { message } = await this._ftpClient.send(command);
        return message;
      }
    });
  }

  public download(path: string, dest: Writable, options: IDownloadOptions = {}): Promise<void> {
    return this._tasks.handle(() => {
      return new Promise(resolve => {
        let resumed = false;

        const transfer = async () => {
          await this.delayAbortion();
          console.log('wtf');
          await this._transfer.download(path, dest, options, resumed);

          console.log('aha');

          if (!this.paused) {
            resolve();
          } else {
            this.once('resume', () => {
              //resumed = true;
              // options.startAt = this._transfer._buffered;
              transfer();
            });
          }
        }

        transfer();
      });
    });
  }

  public upload(path: string, source: Readable, options?: ITransferOptions): Promise<void> {
    return this._tasks.handle(() => {
      return this._transfer.upload(path, source, options);
    });
  }

  public async pauseTransfer() {
    this.paused = true;

    const buffered = await this.abort();
    this.emit('pause');

    return buffered;
  }

  public async resumeTransfer() {
    this.paused = false;
    this.emit('resume');
  }

  public touch(path: string): Promise<void> {
    if (this.isSftp) {
      return this._tasks.handle(() => {
        return this._sftpClient.touch(path);
      });
    }

    const source = new Readable({ read() { } });
    source.push(null);

    return this.upload(path, source, { quiet: true });
  }

  public async createBlank(type: 'folder' | 'file', path = './', files?: IFile[]): Promise<string> {
    if (!files) {
      files = await this.readDir(path);
    }

    const fileName = createFileName(files, `new ${type}`);
    const filePath = `${path}/${fileName}`;

    if (type === 'folder') {
      await this.mkdir(filePath)
    } else {
      await this.touch(filePath)
    }

    return fileName;
  }

  public get protocol(): IProtocol {
    return this.config ? this.config.protocol : null;
  }

  public get isSftp() {
    return this.protocol === 'sftp';
  }

  public delayAbortion() {
    if (!this.aborting) return null;

    return new Promise(resolve => {
      this.once('abort', () => {
        resolve();
      });
    });
  }
}

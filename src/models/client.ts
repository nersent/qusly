import { EventEmitter } from 'events';
import { Client as FtpClient, parseList } from 'basic-ftp';

import { IConfig, IProtocol, IFile, IStats } from '../interfaces';
import { formatFile, getFileTypeFromStats, getFileType } from '../utils';
import { TaskManager } from './task-manager';
import { SftpClient } from './sftp-client';

export declare interface Client {
  on(event: 'connect', listener: Function): this;
  on(event: 'disconnect', listener: Function): this;
  on(event: 'abort', listener: Function): this;
  once(event: 'connect', listener: Function): this;
  once(event: 'disconnect', listener: Function): this;
  once(event: 'abort', listener: Function): this;
}

export class Client extends EventEmitter {
  public connected = false;

  public config: IConfig;

  private _tasks = new TaskManager();

  private _ftpClient: FtpClient;

  private _sftpClient: SftpClient;

  public async connect(config: IConfig): Promise<void> {
    if (this.connected) {
      await this.disconnect();
    }

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
    this.connected = true;
    // this._transferManager.closeStreams();

    if (this.isSftp) {
      this._sftpClient.disconnect();
    } else {
      this._ftpClient.close();
    }

    this._sftpClient = null;
    this._ftpClient = null;

    // if (!this.aborting) {
    //   this.emit('disconnect');
    // }
  }

  public async readDir(path?: string): Promise<IFile[]> {
    return this._tasks.handle(async () => {
      if (this.isSftp) {
        const list = await this._sftpClient.readDir(path || './');
        return list.map(file => formatFile(parseList(file.longname)[0]))
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
      } else {
        return this._ftpClient.size(path);
      }
    });
  }

  public move(srcPath: string, destPath: string): Promise<void> {
    return this._tasks.handle(() => {
      if (this.isSftp) {
        return this._sftpClient.move(srcPath, destPath);
      } else {
        return this._ftpClient.rename(srcPath, destPath);
      }
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
      } else {
        return this._ftpClient.remove(path);
      }
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

  public get protocol(): IProtocol {
    return this.config ? this.config.protocol : null;
  }

  private get isSftp() {
    return this.protocol === 'sftp';
  }
}

import { Writable, Readable } from 'stream';
import { EventEmitter } from 'events';
import { Client as FtpClient, parseList } from 'basic-ftp';

import { IConfig, IProtocol, IFile, IStats, ITransferOptions, ITransferInfo, ITransferProgress, ITransferStatus } from '../interfaces';
import { formatFile, getFileTypeFromStats, getFileType, createFileName } from '../utils';
import { TaskManager } from './task-manager';
import { SftpClient } from './sftp-client';
import { TransferManager } from './transfer-manager';

export interface IClientBaseMethods {
  /**Connects to a server.*/
  connect(config: IConfig): Promise<void>;
  /**Disconnects from the server. Closes all opened sockets and streams.*/
  disconnect(): Promise<void>;
  /**Aborts the current file transfer by reconnecting with the server.*/
  abort(): Promise<void>;
  /**Lists files and folders in specified directory.*/
  readDir(path?: string): Promise<IFile[]>;
  /**Returns the size of a file.*/
  size(path: string): Promise<number>;
  /**Moves a file.*/
  move(srcPath: string, destPath: string): Promise<void>;
  /**Returns details about a file*/
  stat(path: string): Promise<IStats>;
  /**Removes a file.*/
  unlink(path: string): Promise<void>;
  /**Removes a folder and all of its content.*/
  rimraf(path: string): Promise<void>;
  /**Removes any file and folder. */
  delete(path: string): Promise<void>;
  /**Creates a new folder. */
  mkdir(path: string): Promise<void>;
  /**Returns path of the current working directory.*/
  pwd(): Promise<string>;
  /**Checks if a file exists. */
  exists(path: string): Promise<boolean>;
  /**Sends a raw command. Output depends on protocol and server support!*/
  send(command: string): Promise<string>;
  /**Creates an empty file. */
  touch(path: string): Promise<void>;
  /**Creates an empty file or folder with unique name and returns the name.
   * If you don't provide the `files` argument, it will list the directory. */
  createBlank(type: 'folder' | 'file', path: string, files?: IFile[]): Promise<string>;
}

interface IClientMethods extends IClientBaseMethods {
  /**Downloads a remote file and and pipes it to a writable stream.*/
  download(path: string, dest: Writable, options?: ITransferOptions): Promise<ITransferStatus>;
  /**Uploads a local file from readable stream.*/
  upload(path: string, source: Readable, options?: ITransferOptions): Promise<ITransferStatus>;
}

export declare interface Client {
  /**Emitted when the client has connected with a server.*/
  on(event: 'connected', listener: (context: Client) => void): this;
  /**Emitted when the client has disconnected from a server.*/
  on(event: 'disconnected', listener: (context: Client) => void): this;
  /**Emitted when a chunk of a file was read and sent.*/
  on(event: 'progress', listener: (progress: ITransferProgress, info: ITransferInfo) => void): this;
  /**Emitted when any operation is aborted.*/
  on(event: 'aborted', listener: (context: Client) => void): this;
  once(event: 'connected', listener: (context: Client) => void): this;
  once(event: 'disconnected', listener: (context: Client) => void): this;
  once(event: 'progress', listener: (progress: ITransferProgress, info: ITransferInfo) => void): this;
  once(event: 'aborted', listener: (context: Client) => void): this;
  removeListener(event: 'connected' | 'disconnected' | 'progress' | 'aborted', listener: Function): this;
}

export class Client extends EventEmitter implements IClientMethods {
  public connected = false;

  public config: IConfig;

  public _ftpClient: FtpClient;

  public _sftpClient: SftpClient;

  protected _tasks = new TaskManager();

  public _transfer = new TransferManager(this);

  public async connect(config: IConfig): Promise<void> {
    this.config = config;
    this.connected = false;

    if (!this.config.port) {
      this.config.port = this.config.protocol === 'sftp' ? 22 : 21;
    }

    if (this.isSftp) {
      this._sftpClient = new SftpClient(this);

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
    this.emit('connected', this);
  }

  public async disconnect() {
    if (!this.connected) return;

    this.connected = false;

    if (this.isSftp) {
      await this._sftpClient.disconnect();
    } else {
      this._ftpClient.close();
      this._ftpClient = undefined;
    }

    this.emit('disconnected', this);
  }

  public async abort() {
    await this.disconnect();
    await this.connect(this.config);

    this.emit('aborted', this);
  }

  public download(path: string, dest: Writable, options?: ITransferOptions): Promise<ITransferStatus> {
    return this._tasks.handle(() => {
      return this._transfer.download(path, dest, options);
    });
  }

  public upload(path: string, source: Readable, options?: ITransferOptions): Promise<ITransferStatus> {
    return this._tasks.handle(() => {
      return this._transfer.upload(path, source, options);
    });
  }

  public async readDir(path?: string): Promise<IFile[]> {
    return this._tasks.handle(async () => {
      if (this.isSftp) {
        const list = await this._sftpClient.readDir(path || './');

        return list.map(file => {
          return formatFile(parseList(file.longname)[0])
        });
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

  public unlink(path: string): Promise<void> {
    return this._tasks.handle(() => {
      if (this.isSftp) {
        return this._sftpClient.unlink(path);
      }

      return this._ftpClient.remove(path);
    });
  }

  public async rimraf(path: string): Promise<void> {
    return this._tasks.handle(() => {
      if (this.isSftp) {
        return this._sftpClient.removeDir(path);
      }

      return this._ftpClient.removeDir(path);
    });
  }

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

  public async touch(path: string): Promise<void> {
    if (this.isSftp) {
      return this._tasks.handle(() => {
        return this._sftpClient.touch(path);
      });
    }

    const source = new Readable({ read() { } });
    source.push(null);

    await this.upload(path, source, { quiet: true });
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
}

import { Writable, Readable } from 'stream';
import { EventEmitter } from 'events';
import { Client as FtpClient, parseList } from 'basic-ftp';


import { SFTPClient } from './sftp-client';
import { IConfig, IProtocol } from './config';
import { IRes, ISizeRes, ISendRes, IPwdRes, IReadDirRes, IAbortRes } from './res';
import { formatFile } from '../utils';
import { TransferManager } from './transfer';
import { IProgressEvent } from './progress-event';

export declare interface Client {
  on(event: 'connect', listener: Function): this;
  on(event: 'disconnect', listener: Function): this;
  on(event: 'progress', listener: (data?: IProgressEvent) => void): this;
  on(event: 'abort', listener: Function): this;
  once(event: 'connect', listener: Function): this;
  once(event: 'disconnect', listener: Function): this;
  once(event: 'abort', listener: Function): this;
  on(event: '_available', listener: Function): this;
}

export class Client extends EventEmitter {
  public connected = false;

  private _config: IConfig;

  public _ftpClient: FtpClient;

  public _sftpClient: SFTPClient;

  private _transferManager = new TransferManager(this);

  private _busy = false;

  /**
  * Connects to server.
  * You can call it to reconnect.
  * @param config Connection config
  */
  public async connect(config: IConfig): Promise<IRes> {
    if (this.connected) {
      await this.disconnect();
    }

    this._config = config;
    this.connected = false;

    const data = await this._wrap(
      () => {
        this._sftpClient = new SFTPClient();
        return this._sftpClient.connect(config);
      },
      async () => {
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
    );

    if (data.success) {
      this.emit('connect');
      this.connected = true;
    }

    return data;
  }

  /**
    * Disconnects from server.
    * Closes all opened sockets.
    */
  public async disconnect(): Promise<IRes> {
    this.connected = true;
    this._transferManager.closeStreams();

    const res = await this._wrap(() => {
      this._sftpClient.disconnect();
      this._sftpClient = null;
    }, () => {
      this._ftpClient.close();
      this._ftpClient = null;
    }, null, false);

    if (!this.aborting) {
      this.emit('disconnect');
    }

    return res;
  }

  /**
   * Gets size of a file in bytes.
   * @param path Remote path
   */
  public size(path: string): Promise<ISizeRes> {
    return this._wrap(
      () => this._sftpClient.size(path),
      () => this._ftpClient.size(path),
      'size',
    );
  }

  /**
    * Sends a raw command. **Output depends on a protocol and server support!**
    */
  public send(command: string): Promise<ISendRes> {
    return this._wrap(
      () => this._sftpClient.send(command),
      async () => {
        const { message } = await this._ftpClient.send(command);
        return message;
      },
      'message',
    );
  }

  /**
    * Moves or renames a file.
    * @param srcPath Source path
    * @param destPath Destination path
    */
  public move(srcPath: string, destPath: string): Promise<IRes> {
    return this._wrap(
      () => this._sftpClient.move(srcPath, destPath),
      () => this._ftpClient.rename(srcPath, destPath),
    );
  }

  /**
  * Removes a file.
  * @param path Remote path
  */
  public unlink(path: string): Promise<IRes> {
    return this._wrap(
      () => this._sftpClient.unlink(path),
      () => this._ftpClient.remove(path),
    );
  }

  /**
    * Removes a directory and all of its content.
    * @param path Directory path
    */
  public async rimraf(path: string): Promise<IRes> {
    return this._wrap(
      () => this._sftpClient.removeDir(path),
      () => this._ftpClient.removeDir(path),
    );
  }

  /**
   * Creates a directory.
   * @param path Remote path
   */
  public mkdir(path: string): Promise<IRes> {
    return this._wrap(
      () => this._sftpClient.mkdir(path),
      () => this._ftpClient.send("MKD " + path, true),
    );
  };

  /**
   * Gets path of the current working directory.
   */
  public pwd(): Promise<IPwdRes> {
    return this._wrap(
      () => this._sftpClient.pwd(),
      () => this._ftpClient.pwd(),
      'path'
    );
  }

  /**
   * Reads the content of a directory.
   */
  public readDir(path?: string): Promise<IReadDirRes> {
    return this._wrap(
      async () => {
        const files = await this._sftpClient.readDir(path || './');
        return files.map(file => formatFile(parseList(file.longname)[0]))
      },
      async () => {
        const files = await this._ftpClient.list(path);
        return files.map(file => formatFile(file));
      },
      'files'
    );
  }

  /**
   * Downloads a file.
   * @param path Remote path of a file
   * @param destination Destination stream
   * @param startAt - Offset to start at
   */
  public download(path: string, destination: Writable, startAt = 0, blockProgress = false): Promise<IRes> {
    return this._transferManager.download(path, destination, startAt, blockProgress)
  }

  /**
   * Uploads a file.
   * @param path Remote path of a file
   * @param source Source stream
   * @param fileSize Size of a file. Can be used to further tracking progress.
   */
  public async upload(path: string, source: Readable, fileSize?: number, blockProgress = false): Promise<IRes> {
    return this._transferManager.upload(path, source, fileSize, blockProgress);
  }

  /**
   * Aborts the current data transfer.
   */
  public async abort(): Promise<IAbortRes> {
    if (!this.aborting) {
      this.aborting = true;
      this._transferManager.closeStreams();

      const res = await this.connect(this._config);

      this.aborting = false;
      return { ...res, bytes: this._transferManager.buffered };
    }

    return { success: false };
  }

  /**
   * Creates an empty file.
   * @param path Remote path
   */
  public touch(path: string): Promise<IRes> {
    return this._wrap(
      () => this._sftpClient.touch(path),
      () => {
        const source = new Readable({ read() { } });
        source.push(null);

        return this.upload(path, source, null, true);
      }
    );
  }

  /**
   * Checks if file exists.
   */
  public async exists(path: string): Promise<boolean> {
    try {
      if (this.protocol === 'sftp') {
        await this._sftpClient.stat(path);
      } else {
        await this._ftpClient.rename(path, path);
      }
    } catch (err) {
      return false;
    }

    return true;
  }

  private async _wrap(sftp: Function, ftp: Function, key?: string, checkStatus = true) {
    try {
      const isSftp = this.protocol == 'sftp';
      const data = isSftp ? await sftp() : await this._wrapFtp(ftp, checkStatus);

      let res = { success: true };
      if (key != null) {
        res[key] = data;
      }

      this._setAvailable();
      return res;
    } catch (error) {
      this._setAvailable();
      return { success: false, error }
    }
  }

  private _wrapFtp(fn: Function, checkStatus: boolean) {
    return new Promise((resolve) => {
      if (!checkStatus || !this._busy) {
        this._busy = true;
        return resolve(fn());
      }

      const handle = () => {
        if (!this._busy) {
          this._busy = true;
          this.removeListener('_available', handle);
          resolve(fn());
        }
      };

      this.on('_available', handle);
    });
  }

  public get protocol(): IProtocol {
    return this._config != null ? this._config.protocol : null;
  }

  public get aborting() {
    return this._transferManager.aborting;
  }

  public set aborting(value: boolean) {
    this._transferManager.aborting = value;
  }

  private _setAvailable() {
    this._busy = false;
    this.emit('_available');
  }
};

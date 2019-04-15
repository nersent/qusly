import { EventEmitter } from 'events';
import { Writable, Readable, Stream } from 'stream';
import { Client as FtpClient } from 'basic-ftp';
import {  Client as SshClient, SFTPWrapper } from 'ssh2';

import { IConfig, IProtocol, IResponse, ISizeResponse } from '.';
import { getResponseData } from '../utils';
import { IProgressEventData } from './progress';

export declare interface Client {
  on(event: 'connect', listener: Function): this;
  on(event: 'disconnect', listener: Function): this;
  on(event: 'progress', listener: (data?: IProgressEventData) => void): this;
  once(event: 'connect', listener: Function): this;
  once(event: 'disconnect', listener: Function): this;
}

export class Client extends EventEmitter {
  public connected = false;

  protected _config: IConfig;

  protected _ftpClient: FtpClient;

  protected _sftpClient: SFTPWrapper;

  protected _sshClient: SshClient;

  protected _writable: Writable;
  
  protected _readable: Readable;

  protected get _isSFTP() {
    return this._config.protocol === 'sftp';
  }

  protected _flushStreams() {
    if (this._readable != null) {
      this._readable.removeAllListeners();
      this._readable.unpipe(this._writable);
      this._readable.destroy();
      this._readable = null;
    }

    if (this._writable != null) {
      if (!this._isSFTP) {
        this._ftpClient.ftp.dataSocket.unpipe(this._writable);
      }

      this._writable.removeAllListeners();
      this._writable.uncork();
      this._writable.end();
      this._writable.destroy();
      this._writable = null;
    }
  }

  /**
   * Connects to a server.
   * @param config - Connection config
   */
  public async connect(config: IConfig): Promise<IResponse> {
    this._config = config;

    if (this._isSFTP) {
      return new Promise((resolve) => {
        if (this.connected) this.disconnect();

        const onError = (err) => {
          this.disconnect();
          resolve(getResponseData(err));
        }

        this._sshClient = new SshClient();

        this._sshClient.once('error', onError);
        this._sshClient.once('ready', () => {
          this._sshClient.removeAllListeners();
          this._sshClient.sftp((err, sftp) => {
            if (err) return onError(err);

            this._sftpClient = sftp;
            this.connected = true;
            this.emit('connect');
            resolve(getResponseData());
          });
        });

        this._sshClient.connect({ username: config.user, ...config })
      });
    }

    this._ftpClient = new FtpClient();
  
    try {
      await this._ftpClient.access({ secure: true, ...config });
      this.connected = true;
      this.emit('connect');
      return getResponseData();
    } catch(err) {
      return getResponseData(err);
    }
  }

  /**
   * Disconnects from a server.
   * Closes all opened sockets.
   * To reconnect call `connect` method.
   */
  public disconnect() {
    this._flushStreams();
    if (this._isSFTP) this._sshClient.end();
    else this._ftpClient.close();
    this._ftpClient = null;
    this._sshClient = null;
    this._sftpClient = null;
    this.emit('disconnect');
  }


  /**
   * Gets size of a file.
   * @param path - Remote path of a file
   */
  public async getSize(path: string): Promise<ISizeResponse> {
    if (!this.connected) return getResponseData(new Error('Client is not connected'));

    if (this._isSFTP) {
      return new Promise((resolve) => {
        this._sftpClient.stat(path, (err, stats) => {
          resolve(getResponseData(err, stats && { value: stats.size }));
        })
      });
    }

    try {
      const size = await this._ftpClient.size(path);
      return getResponseData(null, { value: size });
    } catch (err) {
      return getResponseData(err);
    }
  }

  /**
   * Downloads a file.
   * @param path - Remote path of a file
   * @param destination - Writable stream of a local file
   * @param startAt - The offset to start at
   */
  public async download(path: string, destination: Writable, startAt = 0) {
    if (!this.connected) return getResponseData(new Error('Client is not connected'));

    const sizeRes = await this.getSize(path);
    if (!sizeRes.success) return sizeRes;

    if (this._isSFTP) {
      return new Promise((resolve) => {
        this._writable = destination;
        this._readable = this._sftpClient.createReadStream(path, { start: startAt });
        let buffered = 0;

        this._readable.on('data', (chunk) => {
          buffered += chunk.length;

          this.emit('progress', {
            type: 'download',
            bytes: buffered,
            fileSize: sizeRes.value,
            path,
          } as IProgressEventData);
        });

        this._readable.once('error', (err) => {
          this._readable.destroy();
          resolve(getResponseData(err));
        });

        this._readable.once('close', () => {
          this._flushStreams();
          resolve(getResponseData());
         });
 
         this._readable.pipe(this._writable);
      });
    }

    try {
      this._writable = destination;
      this._ftpClient.trackProgress(info => {
        this.emit('progress', {
          type: 'download',
          bytes: info.bytes,
          fileSize: sizeRes.value,
          path,
        } as IProgressEventData);
      });

      await this._ftpClient.download(this._writable, path, startAt);

      this._ftpClient.trackProgress(undefined);
      this._flushStreams();

      return getResponseData();
    } catch (err) {
      this._ftpClient.trackProgress(undefined);
      this._flushStreams();
      return getResponseData(err); 
    }
  }

  public async abort() {
    this.disconnect();
    await this.connect(this._config);
  }
};
import { EventEmitter } from 'events';
import { Writable, Readable, Stream } from 'stream';
import { Client as FtpClient } from 'basic-ftp';
import {  Client as SshClient, SFTPWrapper } from 'ssh2';

import { IConfig, IProtocol, IResponse, ISizeResponse } from '.';
import { getResponseData } from '../utils';
import { IDownloadOptions } from './options';
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

  protected get isSFTP() {
    return this._config.protocol === 'sftp';
  }

  /**
   * Connects to a server.
   * @param config Connection config
   */
  public async connect(config: IConfig): Promise<IResponse> {
    this._config = config;

    if (this.isSFTP) {
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
    if (this.isSFTP) this._sshClient.end();
    else this._ftpClient.close();
    this._ftpClient = null;
    this._sshClient = null;
    this._sftpClient = null;
    this.emit('disconnect');
  }


  /**
   * Gets size of a file.
   * @param path Remote path of a file
   */
  public async getSize(path: string): Promise<ISizeResponse> {
    if (!this.connected) return getResponseData(new Error('Client is not connected'));

    if (this.isSFTP) {
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
   * @param path Remote path of a file
   * @param destination Writable stream of a local file
   * @param options Additional options e.g. start offset
   */
  public async download(path: string, destination: Writable, options?: IDownloadOptions) {
    if (!this.connected) return getResponseData(new Error('Client is not connected'));

    const sizeRes = await this.getSize(path);
    if (!sizeRes.success) return sizeRes;

    if (this.isSFTP) {
      return new Promise((resolve) => {
        const stream = this._sftpClient.createReadStream(path, options);
        let buffered = 0;

        stream.on('data', (chunk) => {
          buffered += chunk.length;

          this.emit('progress', {
            type: 'download',
            bytes: buffered,
            fileSize: sizeRes.value,
            path,
          } as IProgressEventData);
        });

        stream.once('error', (err) => {
          stream.destroy();
          resolve(getResponseData(err));
        });

        stream.once('close', () => {
          stream.removeAllListeners();
          stream.unpipe(destination);
          destination.end();
          resolve(getResponseData());
         });
 
         stream.pipe(destination);
      });
    }

    try {
      this._ftpClient.trackProgress(info => {
        this.emit('progress', {
          type: 'download',
          bytes: info.bytes,
          fileSize: sizeRes.value,
          path,
        } as IProgressEventData);
      });

      const { start } = options;
      await this._ftpClient.download(destination, path, start);

      this._ftpClient.trackProgress(undefined);
      return getResponseData();
    } catch (err) {
      this._ftpClient.trackProgress(undefined);
      return getResponseData(err); 
    }
  }
};
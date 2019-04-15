import { EventEmitter } from 'events';
import { Writable, Readable, Stream } from 'stream';
import { Client as FtpClient } from 'basic-ftp';
import {  Client as SshClient, SFTPWrapper } from 'ssh2';

import { IConfig, IProtocol, IResponse, ISizeResponse, IAbortResponse } from '.';
import { getResponseData } from '../utils';
import { IProgressEventData } from './progress';

export declare interface Client {
  on(event: 'connect', listener: Function): this;
  on(event: 'disconnect', listener: Function): this;
  on(event: 'progress', listener: (data?: IProgressEventData) => void): this;
  on(event: 'abort', listener: Function): this;
  once(event: 'connect', listener: Function): this;
  once(event: 'disconnect', listener: Function): this;
  once(event: 'abort', listener: Function): this;
}

export class Client extends EventEmitter {
  public connected = false;

  protected _config: IConfig;

  protected _ftpClient: FtpClient;

  protected _sftpClient: SFTPWrapper;

  protected _sshClient: SshClient;

  protected _writable: Writable;
  
  protected _readable: Readable;

  protected _aborting = false;
  
  protected _buffered = 0;

  protected get _isSFTP() {
    return this._config.protocol === 'sftp';
  }

  protected _cleanStreams() {
    if (this._readable != null) {
      this._readable.removeAllListeners();
      this._readable.unpipe(this._writable);
      
      if (this._writable != null) {
        this._writable.removeAllListeners();

        this._readable.once('close', () => {
          this._writable.end();
          this._writable = null;
          this._readable = null;
        });
  
        this._readable.destroy();
      }
    } else {
      this._writable.end();
    }

    if (!this._isSFTP && this._ftpClient.ftp.dataSocket != null) {
      this._ftpClient.ftp.dataSocket.unpipe(this._writable);
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
            if (!this._aborting) this.emit('connect');
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
      if (!this._aborting) this.emit('connect');
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
    this.connected = false;
    this._cleanStreams();
    if (this._isSFTP) this._sshClient.end();
    else this._ftpClient.close();
    this._ftpClient = null;
    this._sshClient = null;
    this._sftpClient = null;
    if (!this._aborting) this.emit('disconnect');
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
   * Aborts current data transfer like download and upload.
   */
  public async abort(): Promise<IAbortResponse> {
    this._aborting = true;
    this._cleanStreams();
    this.disconnect();
  
    const res = await this.connect(this._config);

    this._aborting = false;
    this.emit('abort');   

    return res.success ? getResponseData(null, { bytes: this._buffered }) : res;
  }
  
  /**
   * Downloads a file.
   * @param path - Remote path of a file
   * @param destination - Destination file
   * @param startAt - Offset to start at
   */
  public async download(path: string, destination: Writable, startAt = 0): Promise<IResponse> {
    if (!this.connected) return getResponseData(new Error('Client is not connected'));

    const sizeRes = await this.getSize(path);
    if (!sizeRes.success) return sizeRes;

    const fileSize = sizeRes.value - startAt;

    this._writable = destination;

    if (this._isSFTP) {
      return new Promise((resolve) => {
        this._buffered = 0;
        this._readable = this._sftpClient.createReadStream(path, { start: startAt });

        this._readable.on('data', (chunk) => {
          this._buffered += chunk.length;

          this.emit('progress', {
            type: 'download',
            bytes: this._buffered,
            fileSize,
            path,
          } as IProgressEventData);
        });

        this._readable.once('error', (err) => {
          this._cleanStreams();
          resolve(getResponseData(err));
        });

        this._readable.once('close', () => {
          this._cleanStreams();
          resolve(getResponseData());
         });
 
         this._readable.pipe(this._writable);
      });
    }

    try {
      this._ftpClient.trackProgress(info => {
        this._buffered = info.bytes;

        this.emit('progress', {
          type: 'download',
          bytes: info.bytes,
          fileSize,
          path,
        } as IProgressEventData);
      });

      await this._ftpClient.download(this._writable, path, startAt);

      this._ftpClient.trackProgress(undefined);
      this._cleanStreams();

      return getResponseData();
    } catch (err) {
      this._ftpClient.trackProgress(undefined);
      this._cleanStreams();
      return getResponseData(err);
    }
  }

  /**
   * Uploads a file.
   * @param path - Remote path of a file
   * @param source - Source file
   */
  public async upload(path: string, source: Readable, fileSize?: number): Promise<IResponse> {
    this._readable = source;

    if (this._isSFTP) {
      return new Promise((resolve) => {
        this._buffered = 0;
        this._writable = this._sftpClient.createWriteStream(path, { flags: 'r+' });

        this._readable.on('data', (chunk) => {
          this._buffered += chunk.length;

          this.emit('progress', {
            type: 'upload',
            bytes: this._buffered,
            fileSize,
            path,
          } as IProgressEventData);
        });

        this._readable.once('error', (err) => {
          this._cleanStreams();
          resolve(getResponseData(err));
        });

        this._readable.once('close', () => {
          this._cleanStreams();
          resolve(getResponseData());
        });

        this._readable.pipe(this._writable);
      });
    }
   
    try {
      // await this._ftpClient.send(`REST ${startAt}`);

      this._ftpClient.trackProgress(info => {
        this._buffered = info.bytes;

        this.emit('progress', {
          type: 'upload',
          bytes: info.bytes,
          fileSize,
          path,
        } as IProgressEventData);
      });

      await this._ftpClient.upload(this._readable, path);

      this._ftpClient.trackProgress(undefined);
      this._cleanStreams();

      return getResponseData();
    } catch (err) {
      this._ftpClient.trackProgress(undefined);
      this._cleanStreams();
      return getResponseData(err); 
    }
  }
};
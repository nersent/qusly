import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';
import { Client as FtpClient, RawListParser } from 'basic-ftp';
import {  Client as SshClient, SFTPWrapper } from 'ssh2';
import { FileEntry } from 'ssh2-streams';

import { IResponse, IAbortResponse, ISizeResponse, IExecResponse, ILsResponse } from './res';
import { getResponseData } from '../utils';
import { IProgressEventData } from './progress';
import { IHandler } from './handler';
import { IConfig } from './config';
import { IFile, IFileType } from './file';

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
   * @param destination - Destination file
   * @param startAt - Offset to start at
   */
  public async download(path: string, destination: Writable, startAt = 0): Promise<IResponse> {
    if (!this.connected) return getResponseData(new Error('Client is not connected'));

    const sizeResponse = await this.getSize(path);
    if (!sizeResponse.success) return sizeResponse;
    const fileSize = sizeResponse.value - startAt;

    if (this._isSFTP) {
      this._buffered = 0;
      this._readable = this._sftpClient.createReadStream(path, { start: startAt });
    }
    this._writable = destination;
    
    return this._handleStream({
      type: 'download',
      fileSize,
      path,
      startAt
    });
  }

  /**
   * Uploads a file.
   * @param path - Remote path of a file
   * @param source - Source file
   */
  public async upload(path: string, source: Readable, fileSize?: number): Promise<IResponse> {
    if (this._isSFTP) {
      this._buffered = 0;
      this._writable = this._sftpClient.createWriteStream(path);
    }
    this._readable = source;
    
    return this._handleStream({
      type: 'upload',
      fileSize,
      path,
    });
  }

  /**
   * Send a command.
   * @param command - Command to send
   */
  public async send(command: string): Promise<IExecResponse> {
    if (this._isSFTP) {
      return new Promise((resolve) => {
        this._sshClient.exec(command, (err, stream): any => {
          if (err) return getResponseData(err);

          let data = '';

          stream.once('error', (err: Error) => {
            stream.close();
            resolve(getResponseData(err));
          });
          
          stream.on('data', (chunk) => {
            data += chunk;
          });
          
          stream.once('close', () => {
            stream.close();
            resolve(getResponseData(null, { message: data }));
          })
        })
      });
    }

    try {
      const res = await this._ftpClient.send(command);
      return getResponseData(null, { message: res.message });
    } catch (err) {
      return getResponseData(err);
    }
  }

  /**
   * Moves/Renames a file.
   * @param srcPath - Source path
   * @param destPath - Destination path
   */
  public async move(srcPath: string, destPath: string): Promise<IResponse> {
    if (this._isSFTP) {
      return new Promise((resolve) => {
        this._sftpClient.rename(srcPath, destPath, (err) => {
          resolve(getResponseData(err));
        });
      });
    }

    try {
      await this._ftpClient.rename(srcPath, destPath);
      return getResponseData();
    } catch (err) {
      return getResponseData(err);
    }
  }

  /**
   * Removes a file.
   * @param path - File path
   */
  public async remove(path: string): Promise<IResponse> {
    if (this._isSFTP) {
      return new Promise((resolve) => {
        this._sftpClient.unlink(path, (err) => {
          resolve(getResponseData(err));
        })
      });
    }

    try {
      await this._ftpClient.remove(path);
      return getResponseData(null);
    } catch (err) {
      return getResponseData(err);
    }
  }

  /**
   * Remove a directory and all of its content.
   * @param path - Directory path
   */
  public async removeDir(path: string): Promise<IResponse> {
    try {
      if (this._isSFTP) {
        await this._sftpRemoveDir(path);
      } else {
        await this._ftpClient.removeDir(path);
      }

      return getResponseData(null);
    } catch (err) {
      return getResponseData(err);
    }
  }

  /**
   * Creates a directory at `dirPath`.
   */
  public async createDir(dirPath: string): Promise<IResponse> {
    if (this._isSFTP) {
      return new Promise((resolve) => {
        this._sftpClient.mkdir(dirPath, (err) => {
          resolve(getResponseData(err));
        })
      });
    }

    try {
      await this._ftpClient.send("MKD " + dirPath, true);
      return getResponseData(null);
    } catch (err) {
      return getResponseData(err);
    }
  };

  public async ls(path: string): Promise<ILsResponse> {
    if (this._isSFTP) {
      return new Promise((resolve) => {
        this._sftpClient.readdir(path, (err, files) => {
          console.log(files[0].longname);
          console.log(this._ftpClient.parseList);
          resolve(getResponseData(err));
        });
      });
    }

    try {
      await this._ftpClient.cd(path);
      const files = await this._ftpClient.list();

      return getResponseData(null, {
        files: files.map((file) => ({
          name: file.name,
          type: file.type as unknown,
          size: file.size,
          owner: file.user,
          group: file.group,
          mtime: new Date(file.date),
        } as IFile)),
      });
    } catch (err) {
      return getResponseData(err);
    }
  }
  
  /**
   * Sets debugging mode __(currently only FTP)__
   */
  public set debuger(value: boolean) {
    if (!this._isSFTP) {
      this._ftpClient.ftp.verbose = value;
    }
  }

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
    } else if (this._writable) {
      this._writable.end();
    }

    if (!this._isSFTP && this._ftpClient.ftp.dataSocket != null) {
      this._ftpClient.ftp.dataSocket.unpipe(this._writable);
    }
  }

  protected _handleStream(data: IHandler): Promise<IResponse> {
    if (this._isSFTP) {
      return this._handleSftpStream(data);
    }
    return this._handleFtpStream(data);
  }

  protected _handleSftpStream(data: IHandler): Promise<IResponse> {
    const { fileSize, path, type } = data;

    return new Promise((resolve) => {
      this._readable.on('data', (chunk) => {
        this._buffered += chunk.length;

        this.emit('progress', {
          bytes: this._buffered,
          fileSize,
          path,
          type,
        } as IProgressEventData);
      });

      const onError = (err) => {
        this._cleanStreams();
        resolve(getResponseData(err));
      }

      const onClose = () => {
        this._cleanStreams();
        resolve(getResponseData());
      }

      if (type === 'download') {
        this._readable.once('error', onError);
        this._readable.once('close', onClose);
      } else {
        this._writable.once('error', onError);
        this._writable.once('finish', onClose);
      }

      this._readable.pipe(this._writable);
    });
  }

  protected async _handleFtpStream(data: IHandler): Promise<IResponse> {
    const { fileSize, path, type, startAt } = data;

    try {
      this._ftpClient.trackProgress(info => {
        this._buffered = info.bytes;

        this.emit('progress', {
          bytes: info.bytes,
          fileSize,
          path,
          type,
        } as IProgressEventData);
      });

      if (type === 'download') {
        await this._ftpClient.download(this._writable, path, startAt);
      } else {
        await this._ftpClient.upload(this._readable, path);
      }

      this._ftpClient.trackProgress(undefined);
      this._cleanStreams();

      return getResponseData();
    } catch (err) {
      this._ftpClient.trackProgress(undefined);
      this._cleanStreams();
      return getResponseData(err);
    }
  }

  protected async _sftpRemoveDir(path: string) {
    try {
      const files = await this._sftpReadDir(path);

      if (files.length) {
        for (const file of files) {
          const filePath = path + '/' + file.filename;

          if ((file.attrs as any).isDirectory()) {
            await this._sftpRemoveDir(filePath);
          } else {
            await this.remove(filePath);
          }
        }
      }

      await this._sftpRemoveEmptyDir(path);
    } catch (err) {
      throw err;
    }
  };

  protected _sftpReadDir(path: string): Promise<FileEntry[]> {
    return new Promise((resolve, reject) => {
      this._sftpClient.readdir(path, (err, files) => {
        if (err) return reject(err);
        resolve(files);
      });
    });
  }

  protected _sftpRemoveEmptyDir(path: string) {
    return new Promise((resolve, reject) => {
      this._sftpClient.rmdir(path, (err) => {
        if (err) return reject(err);
        resolve();
      })
    });
  };
};
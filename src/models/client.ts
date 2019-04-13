import { Writable, Readable } from 'stream';
import { Client as FtpClient } from 'basic-ftp';
import {  Client as SshClient, SFTPWrapper } from 'ssh2';

import { IConfig, IProtocol, IResponse, ISizeResponse, IProgressEvent, IProgressEventData } from '.';

export class Client {
  private protocol: IProtocol;

  private _ftpClient: FtpClient;

  private _sftpClient: SFTPWrapper;

  private _sshClient: SshClient;

  private buffered = 0;

  public onProgress: IProgressEvent;

  public connect(config: IConfig): Promise<IResponse> {
    return new Promise(async (resolve) => {
      const { protocol } = config;
      this.protocol = protocol;

      if (protocol === 'sftp') {
        this._sshClient = new SshClient();

        const onError = (err) => {
          this._sshClient.removeListener('ready', onReady)
          this.disconnect();

          return resolve({
            success: false,
            error: {
              code: err.level,
              message: err.message,
            }
          });
        };

        const onReady = () => {
          this._sshClient.removeListener('error', onError);
          this._sshClient.sftp((err, sftp) => {
            if (err) {
              this.disconnect();
              throw err;
            }

            this._sftpClient = sftp;
            resolve({ success: true });
          });
        }
        
        this._sshClient.once('error', onError);
        this._sshClient.once('ready', onReady);
        this._sshClient.connect({ username: config.user, ...config })
      } else {
        this._ftpClient = new FtpClient();

        try {
          await this._ftpClient.access({ secure: true, ...config });
          resolve({ success: true });
        } catch(err) {
          resolve({
            success: false,
            error: {
              code: err.code,
              message: err.message,
            }
          });
        }
      }
    });
  }

  public disconnect() {
    if (this.protocol === 'sftp') {
      this._sshClient.end();
    } else {
      this._ftpClient.close();
    }
    this.protocol = null
    this._ftpClient = null;
    this._sshClient = null;
    this._sftpClient = null;
    this.onProgress = null;
    this.buffered = 0;
  }

  public getSize(remotePath: string): Promise<ISizeResponse> {
    return new Promise(async (resolve) => {
      if (this.protocol === 'sftp') {
        this._sftpClient.stat(remotePath, (err, stats) => {
          if (err) {          
            return resolve({
              success: false,
              error: err.message,
            });
          }
          
          resolve({ success: true, value: stats.size })
        })
      } else {
        try {
          const size = await this._ftpClient.size(remotePath);
          resolve({ success: true, value: size });
        } catch (err) {
          resolve({
            success: false,
            error: {
              code: err.code,
              message: err.message,
            }
          });
        }
      }
    });
  }

  public download(remotePath: string, local: Writable, offset = 0): Promise<IResponse> {
    return new Promise(async (resolve) => {
      const size = await this.getSize(remotePath);
      if (!size.success) return resolve(size);

      this.buffered = 0;

      if (this.protocol === 'sftp') {
        const stream = this._sftpClient.createReadStream(remotePath, { start: offset });

        stream.on('data', (chunk) => {
          this.buffered += chunk.length;
          this._onProgress({
            bytes: this.buffered,
            size: size.value,
            type: 'download',
          });
        });

        stream.on('error', (err) => {
          stream.removeAllListeners();
          stream.destroy();

          resolve({
            success: false,
            error: {
              message: err.message
            }
          })
        });

        stream.on('close', () => {
          stream.removeAllListeners();
          stream.destroy();

          resolve({ success: true });
        });

        stream.pipe(local);
      } else {
        try {
          this._ftpClient.trackProgress(info => {
            this.buffered = info.bytes;

            this._onProgress({
              bytes: info.bytes,
              size: size.value,
              type: 'download'
            });
          });

          await this._ftpClient.download(local, remotePath, offset);
          this._ftpClient.trackProgress(undefined);

          resolve({ success: true });
        } catch (err) {
          this._ftpClient.trackProgress(undefined);

          resolve({
            success: false,
            error: {
              code: err.code,
              message: err.message,
            }
          });
        }
      }
    });
  }

  private _onProgress(data: IProgressEventData) {
    if (typeof this.onProgress === 'function') {
      this.onProgress(data);
    }
  }
};
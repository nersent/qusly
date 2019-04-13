import { Writable, Readable } from 'stream';
import { EventEmitter } from 'events';
import { Client as FtpClient } from 'basic-ftp';
import {  Client as SshClient, SFTPWrapper } from 'ssh2';

import { IConfig, IProtocol, IResponse, ISizeResponse } from '.';

export class Client extends EventEmitter {
  private protocol: IProtocol;

  private _ftpClient: FtpClient;

  private _sftpClient: SFTPWrapper;

  private _sshClient: SshClient;

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
};
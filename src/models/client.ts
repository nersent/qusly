import { Client as FtpClient } from 'basic-ftp';
import {  Client as SshClient, SFTPWrapper } from 'ssh2';

import { IConfig, IConnectRes, IProtocol } from '.';

export class Client {
  private protocol: IProtocol;

  private _ftpClient: FtpClient;

  private _sftpClient: SFTPWrapper;

  private _sshClient: SshClient;

  public connect(config: IConfig): Promise<IConnectRes> {
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
};
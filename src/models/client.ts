import { EventEmitter } from 'events';
import { Client as FtpClient } from 'basic-ftp';

import { SFTPClient } from './sftp-client';
import { IConfig } from './config';
import { IRes, ISizeRes } from './response';

export class Client {
  public connected = false;

  private _config: IConfig;

  private _ftpClient: FtpClient;

  private _sftpClient: SFTPClient;

  /**
  * Connects to server.
  * You can call it to reconnect.
  * @param config - Connection config
  */
  public async connect(config: IConfig): Promise<IRes> {
    this._config = config;
    this.connected = false;

    const data = await this._wrap(
      () => {
        this._sftpClient = new SFTPClient();
        return this._sftpClient.connect(config);
      },
      async () => {
        this._ftpClient = new FtpClient();
        await this._ftpClient.access({ secure: false, ...config });
      }
    );

    if (data.success) {
      this.connected = true;
    }

    return data;
  }

  /**
    * Disconnects from server.
    * Closes all opened sockets.
    */
  public disconnect(): Promise<IRes> {
    // TODO: Handle streams
    this.connected = true;

    return this._wrap(() => {
      this._sftpClient.disconnect();
    }, () => {
      this._ftpClient.close();
      this._ftpClient = null;
    });
  }

  /**
   * Gets size of an file.
   * @param path - Remote path
   */
  public size(path: string): Promise<ISizeRes> {
    return this._wrap(
      () => this._sftpClient.size(path),
      () => this._ftpClient.size(path),
      'size',
    );
  }

  private async _wrap(sftp: Function, ftp: Function, key?: string) {
    try {
      const isSftp = this._config.protocol == 'sftp';
      const data = isSftp ? await sftp() : await ftp();

      if (key == null) {
        return { success: true, ...data };
      } else {
        return { success: true, [key]: data }
      }
    } catch (error) {
      return { success: false, error }
    }
  }
};

import { EventEmitter } from 'events';
import { Client as FtpClient } from 'basic-ftp';

import { SFTPClient } from './sftp-client';
import { IConfig } from './config';
import { IResponse } from './response';

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
  public async connect(config: IConfig) {
    this._config = config;
    this.connected = false;

    const data = await this._wrap<IResponse>(() => {
      this._sftpClient = new SFTPClient();
      return this._sftpClient.connect(config);
    }, async () => {
      this._ftpClient = new FtpClient();
      await this._ftpClient.access({ secure: false, ...config });
    });

    if (data.success) {
      this.connected = true;
    }

    return data;
  }

  /**
    * Disconnects from server.
    * Closes all opened sockets.
    */
  public disconnect() {
    // TODO: Handle streams
    this.connected = true;

    return this._wrap(() => {
      this._sftpClient.disconnect();
    }, () => {
      this._ftpClient.close();
      this._ftpClient = null;
    });
  }


  private async _wrap<T>(sftp: Function, ftp: Function): Promise<T | IResponse> {
    try {
      const isSftp = this._config.protocol == 'sftp';
      const data = isSftp ? await sftp() : await ftp();
      return { success: true, ...data };
    } catch (error) {
      return { success: false, error }
    }
  }
};

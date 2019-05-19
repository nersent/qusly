import { EventEmitter } from 'events';
import { Client as FtpClient } from 'basic-ftp';

import { SFTPClient } from './sftp-client';
import { IConfig } from './config';
import { IResponse } from './response';

export declare interface Client {
  on(event: 'connect', listener: Function): this;
  on(event: 'disconnect', listener: Function): this;
  on(event: 'abort', listener: Function): this;
}

export class Client extends EventEmitter {
  public connected = false;

  private _config: IConfig;

  private _ftpClient: FtpClient;

  private _sftpClient: SFTPClient;

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

  private async _wrap<T>(sftp: Function, ftp: Function): Promise<IResponse | T> {
    try {
      const isSftp = this._config.protocol == 'sftp';
      const data = isSftp ? await sftp() : await ftp();
      return { success: true, ...data };
    } catch (error) {
      return { success: false, error }
    }
  }
};

import { EventEmitter } from 'events';
import { Client as FtpClient } from 'basic-ftp';

import { SFTPClient } from './sftp-client';
import { IConfig } from './config';
import { IRes, ISizeRes, ISendRes } from './res';

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

  /**
    * Send a command.
    */
  public send(command: string): Promise<ISendRes> {
    return this._wrap(
      () => this._sftpClient.send(command),
      async () => {
        const { message } = await this._ftpClient.send(command);
        return message;
      },
      'message',
    );
  }

  /**
    * Moves/Renames an file.
    * @param srcPath - Source path
    * @param destPath - Destination path
    */
  public move(srcPath: string, destPath: string): Promise<IRes> {
    return this._wrap(
      () => this._sftpClient.move(srcPath, destPath),
      () => this._ftpClient.rename(srcPath, destPath),
    );
  }

  private async _wrap(sftp: Function, ftp: Function, key?: string) {
    try {
      const isSftp = this._config.protocol == 'sftp';
      const data = isSftp ? await sftp() : await ftp();

      let res = { success: true };
      if (key != null) {
        res[key] = data;
      }

      return res;
    } catch (error) {
      return { success: false, error }
    }
  }
};

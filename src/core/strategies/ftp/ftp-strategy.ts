import { Client } from 'basic-ftp';
import { Writable, Readable } from 'stream';

import { Strategy } from '~/common/strategies/strategy';
import { IFtpConfig, IFtpOptions, ITransferInfo } from '~/common/interfaces';
import { FtpUtils } from './ftp-utils';

export declare interface FtpStrategy {
  config: IFtpConfig;
  options: IFtpOptions;
}

export class FtpStrategy extends Strategy {
  public client: Client;

  public get connected() {
    return this.client?.closed === false;
  }

  protected get isFTPS() {
    return this.config.protocol === 'ftps';
  }

  protected get socket() {
    return this.client?.ftp?.socket;
  }

  connect = async () => {
    if (this.connected) return;

    if (!this.client) {
      this.client = new Client();
    }

    await this.client.access({
      secure: this.isFTPS,
      secureOptions: this.options?.secureOptions,
      ...this.config,
    });

    this.emit('connect');
  };

  disconnect = async () => {
    if (this.connected) {
      this.emit('disconnect');

      return new Promise<void>((resolve) => {
        this.client.close();

        this.client.ftp.socket.once('close', () => {
          this.client = null;
          resolve();
        });
      });
    }

    return null;
  };

  download = async (dest: Writable, info: ITransferInfo) => {
    return this.handleTransfer(() =>
      this.client.downloadTo(dest, info.remotePath, info.startAt),
    );
  };

  upload = async (source: Readable, info: ITransferInfo) => {
    return this.handleTransfer(() =>
      this.client.uploadFrom(source, info.remotePath),
    );
  };

  list = (path) => {
    return this.handle(() =>
      this.client.list(path).then((r) => r.map(FtpUtils.formatFile)),
    );
  };

  size = (path) => {
    return this.handle(() => this.client.size(path));
  };

  exists = async (path: string) => {
    try {
      await this.client.rename(path, path);
    } catch (err) {
      return false;
    }

    return true;
  };

  move = (source, dest) => {
    return this.handle(() => this.client.rename(source, dest));
  };

  removeFile = (path) => {
    return this.handle(() => this.client.remove(path));
  };

  removeEmptyFolder = (path) => {
    return this.handle(() => this.client.removeEmptyDir(path));
  };

  removeFolder = (path) => {
    return this.handle(() => this.client.removeDir(path));
  };

  createFolder = async (path) => {
    await this.send(`MKD ${path}`);
  };

  createEmptyFile = async (path) => {
    const source = Readable.from('\n');

    return this.handle(() => this.client.uploadFrom(source, path));
  };

  pwd = () => {
    return this.handle(() => this.client.pwd());
  };

  send = (command) => {
    return this.handle(() => this.client.send(command).then((r) => r.message));
  };

  protected handle = async (fn: Function) => {
    try {
      return await fn();
    } catch (err) {
      const message = err.message as string;

      if (
        message !== 'Client is closed' &&
        !message.startsWith('User closed client during task')
      ) {
        throw err;
      }
    }
  };

  protected handleTransfer = async (fn: Function) => {
    this.client.trackProgress((info) => this.transferListener(info.bytes));

    await this.handle(fn);

    this.client?.trackProgress(undefined);
  };
}

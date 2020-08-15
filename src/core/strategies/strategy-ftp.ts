import { Client, FileInfo } from 'basic-ftp';
import { Writable, Readable } from 'stream';

import { Strategy } from '~/common/strategies/strategy';
import {
  IFile,
  IFtpConfig,
  ITransferOptions,
  IFtpOptions,
  ITransferInfo,
  ExtractMethods,
  ArgumentTypes,
  UnwrapPromise,
} from '~/common/interfaces';
import { FtpUtils } from '~/core/utils/ftp';
import { FtpInvokerFactory } from './ftp-invoker-factory';

export declare interface FtpStrategy {
  config: IFtpConfig;
  options: IFtpOptions;
}

export class FtpStrategy extends Strategy {
  public client: Client;

  protected invoker = FtpInvokerFactory.create(this);

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
    return this.invoker('list')(path).then((r) => r.map(this.formatFile));
  };

  size = this.invoker('size');

  exists = async (path: string) => {
    try {
      await this.client.rename(path, path);

      return true;
    } catch (err) {
      return false;
    }
  };

  // move = (source, dest) => {
  //   return this.handle(() => this.client.rename(source, dest));
  // };

  move = async (source, dest) => {
    await this.invoker('rename')(source, dest);
  };

  removeFile = async (path) => {
    await this.invoker('remove')(path);
  };

  removeEmptyFolder = async (path) => {
    await this.invoker('removeEmptyDir')(path);
  };

  removeFolder = async (path) => {
    await this.invoker('removeDir')(path);
  };

  createFolder = async (path) => {
    await this.send(`MKD ${path}`);
  };

  createEmptyFile = async (path) => {
    // const source = Readable.from('\n');
    // await this.upload(source, { remotePath: path }, { quiet: true });
  };

  pwd = this.invoker('pwd');

  send = (command) => {
    return this.invoker('send')(command).then((r) => r.message);
  };

  protected formatFile = (file: FileInfo): IFile => {
    return {
      ...FtpUtils.formatFile(file),
      lastModified: FtpUtils.getValidDate(file.date),
    };
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

    return null;
  };

  protected handleTransfer = async (fn: Function) => {
    this.client.trackProgress((info) => this.transferListener(info.bytes));

    await this.handle(fn);

    this.client?.trackProgress(undefined);
  };
}

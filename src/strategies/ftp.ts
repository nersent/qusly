import { Client, FileInfo } from 'basic-ftp';
import { Writable, Readable } from 'stream';

import { StrategyBase } from './base';
import { IFtpConfig, IFtpOptions, ITransferInfo } from '~/interfaces';
import { IFile } from '~/interfaces/file';
import { FtpUtils } from '~/utils/ftp';
import { getFileSizeFromStream } from '~/utils/file';

export class FtpStrategy extends StrategyBase {
  protected client: Client;

  protected config: IFtpConfig;

  protected options: IFtpOptions;

  public get connected() {
    return this.client && !this.client.closed;
  }

  public get isFTPS() {
    return this.config.protocol === 'ftps';
  }

  connect = async (config: IFtpConfig, options?: IFtpOptions) => {
    if (this.connected) return;

    if (!this.client) {
      this.client = new Client();
    }

    this.config = config;
    this.options = options;

    await this.client.access({
      secure: this.isFTPS,
      secureOptions: options?.secureOptions,
      ...config,
    });

    this.emit('connect');
  };

  disconnect = async (): Promise<any> => {
    this.emit('disconnect');

    if (this.connected) {
      return new Promise((resolve) => {
        this.client.close();

        this.client.ftp.socket.on('close', () => {
          this.client = null;
          resolve();
        });
      });
    }
  };

  abort = async () => {
    this.emit('abort');

    await this.disconnect();
    await this.connect(this.config, this.options);
  };

  download = async (dest: Writable, remotePath: string, startAt = 0) => {
    const totalBytes = await this.size(remotePath);

    return this.handleTransfer({ bytes: startAt, totalBytes }, () =>
      this.client.downloadTo(dest, remotePath, startAt),
    );
  };

  upload = async (source: Readable, remotePath: string, quiet?: boolean) => {
    const totalBytes = await getFileSizeFromStream(source);

    return this.handleTransfer({ bytes: 0, totalBytes, quiet }, () => {
      return this.client.uploadFrom(source, remotePath);
    });
  };

  readDir = (path) => {
    return this.handle<IFile[]>(() =>
      this.client.list(path).then((r) => r.map(this.formatFile)),
    );
  };

  size = (path) => {
    return this.handle<number>(() => this.client.size(path));
  };

  move = (source, dest) => {
    return this.handle<void>(() => this.client.rename(source, dest));
  };

  removeFile = (path) => {
    return this.handle<void>(() => {
      return this.client.remove(path);
    });
  };

  removeEmptyDir = (path) => {
    return this.handle<void>(() => {
      return this.client.removeEmptyDir(path);
    });
  };

  removeDir = (path) => {
    return this.handle<void>(() => {
      return this.client.removeDir(path);
    });
  };

  mkdir = async (path) => {
    await this.send(`MKD ${path}`);
  };

  touch = async (path) => {
    const source = Readable.from('\n');

    await this.upload(source, path);
  };

  pwd = () => {
    return this.handle<string>(() => {
      return this.client.pwd();
    });
  };

  send = (command) => {
    return this.handle<string>(() => {
      return this.client.send(command).then((r) => r.message);
    });
  };

  protected formatFile = (file: FileInfo): IFile => {
    return {
      ...FtpUtils.formatFile(file),
      lastModified: FtpUtils.getValidDate(file.date),
    };
  };

  protected handle = async <T>(fn: Function): Promise<T> => {
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

  protected handleTransfer = async (info: ITransferInfo, fn: Function) => {
    const handler = this.prepareTransfer(info);

    this.client.trackProgress((info) => handler(info.bytes));

    await this.handle(fn);

    this.client?.trackProgress(undefined);
    this.finishTransfer();
  };
}

import { Client, FileInfo } from 'basic-ftp';
import { Writable, Readable } from 'stream';

import { StrategyBase } from './strategy-base';
import {
  IFile,
  IFtpConfig,
  IFtpOptions,
  ITransferOptions,
  ITransferRequestInfo,
} from '~/interfaces';
import { FtpUtils } from '~/utils/ftp';
import { getPathFromStream, getFileSize } from '~/utils/file';

export class FtpStrategy extends StrategyBase {
  protected client: Client;

  public get connected() {
    return this.client && !this.client.closed;
  }

  public get isFTPS() {
    return this.config.protocol === 'ftps';
  }

  connect = async (config: IFtpConfig) => {
    if (this.connected) return;

    if (!this.client) {
      this.client = new Client();
    }

    await this.client.access({
      secure: this.isFTPS,
      secureOptions: config?.options?.secureOptions,
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
    await this.connect(this.config);
  };

  download = async (
    dest: Writable,
    remotePath: string,
    options?: ITransferOptions,
  ) => {
    const localPath = getPathFromStream(dest);
    const totalBytes = await this.size(remotePath);

    return this.handleTransfer(
      () => this.client.downloadTo(dest, remotePath, options?.startAt),
      { localPath, remotePath, totalBytes },
      options,
    );
  };

  upload = async (
    source: Readable,
    remotePath: string,
    options?: ITransferOptions,
  ) => {
    const localPath = getPathFromStream(source);
    const totalBytes = await getFileSize(localPath);

    return this.handleTransfer(
      () => this.client.uploadFrom(source, remotePath),
      { localPath, remotePath, totalBytes },
      options,
    );
  };

  list = (path) => {
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

  removeEmptyFolder = (path) => {
    return this.handle<void>(() => {
      return this.client.removeEmptyDir(path);
    });
  };

  removeFolder = (path) => {
    return this.handle<void>(() => {
      return this.client.removeDir(path);
    });
  };

  createFolder = async (path) => {
    await this.send(`MKD ${path}`);
  };

  createEmptyFile = async (path) => {
    const source = Readable.from('\n');

    await this.upload(source, path, { quiet: true });
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

  protected handleTransfer = async (
    fn: Function,
    info: ITransferRequestInfo,
    options: ITransferOptions,
  ) => {
    const handler = this.prepareTransfer(info, options);

    this.client.trackProgress((info) => handler(info.bytes));

    await this.handle(fn);

    this.client?.trackProgress(undefined);
    this.finishTransfer();
  };
}

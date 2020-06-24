import { Client, FileInfo } from 'basic-ftp';

import { StrategyBase } from './base';
import { IFtpConfig, IFtpOptions } from '~/interfaces';
import { IFile } from '~/interfaces/file';
import { FtpUtils } from '~/utils/ftp';

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

  disconnect = async () => {
    this.emit('disconnect');

    if (this.connected) {
      this.client.close();
      this.client = null;
    }
  };

  abort = async () => {
    this.emit('abort');

    await this.disconnect();
    await this.connect(this.config, this.options);
  };

  readDir = () => {
    return this.handle<IFile[]>(() =>
      this.client.list().then((r) => r.map(this.formatFile)),
    );
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
      if (err.message !== 'Client is closed') {
        throw err;
      }
    }

    return null;
  };
}

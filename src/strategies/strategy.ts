import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';

import {
  IFile,
  ITransferOptions,
  ITransferProgressListener,
  ITransferInfo,
} from '../interfaces';
import { Transfer } from '../transfer';

export declare interface Strategy {
  on(event: 'connect', listener: () => void): this;
  on(event: 'disconnect', listener: () => void): this;
  on(event: 'progress', listener: ITransferProgressListener): this;

  once(event: 'connect', listener: () => void): this;
  once(event: 'disconnect', listener: () => void): this;
}

/**
 * An abstract class, which allows to create a custom protocol.
 */
export abstract class Strategy extends EventEmitter {
  public abstract readonly connected: boolean;

  private transfer: Transfer;

  public abstract connect: () => Promise<void>;

  public abstract disconnect: () => Promise<void>;

  public async abort() {
    await this.disconnect();
    await this.connect();
  }

  public abstract download: (
    dest: Writable,
    info: ITransferInfo,
    options?: ITransferOptions,
  ) => Promise<void>;

  public abstract upload: (
    source: Readable,
    info: ITransferInfo,
    options?: ITransferOptions,
  ) => Promise<void>;

  public abstract list: (path?: string) => Promise<IFile[]>;

  public abstract size: (path: string) => Promise<number>;

  public abstract exists: (path: string) => Promise<boolean>;

  public abstract move: (source: string, dest: string) => Promise<void>;

  public abstract removeFile: (path: string) => Promise<void>;

  public abstract removeEmptyFolder: (path: string) => Promise<void>;

  public abstract removeFolder: (path: string) => Promise<void>;

  public abstract createFolder: (path: string) => Promise<void>;

  public abstract createEmptyFile: (path: string) => Promise<void>;

  public abstract pwd: () => Promise<string>;

  public abstract send: (command: string) => Promise<string>;

  constructor(
    protected readonly config: any,
    protected readonly options?: any,
  ) {
    super();
  }

  protected prepareTransfer(info: ITransferInfo, options?: ITransferOptions) {
    this.transfer = new Transfer(info, options, (data, progress) => {
      this.emit('progress', data, progress);
    });

    return this.transfer.handleProgress;
  }

  protected finishTransfer() {
    this.transfer = null;
  }

  protected handleNetwork<T = void>(cb: any, clean?: any) {
    return new Promise<T>((resolve, reject) => {
      const onClean = () => {
        this.removeListener('disconnect', onDisconnect);

        if (clean) {
          clean(onResolve, onReject);
        }
      };

      const onDisconnect = () => onResolve(null);

      const onResolve = (data: any) => {
        onClean();
        resolve(data);
      };

      const onReject = (err: Error) => {
        onClean();
        reject(err);
      };

      this.once('disconnect', onDisconnect);

      cb(onResolve, onReject);
    });
  }
}

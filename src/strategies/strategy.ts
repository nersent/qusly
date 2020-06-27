import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';

import {
  IFile,
  ITransferOptions,
  ITransferRequestInfo,
  ITransferProgressEventListener,
  IConfig,
} from '~/interfaces';
import { Transfer } from '~/transfer';

export declare interface Strategy {
  on(event: 'connect', listener: () => void): this;
  on(event: 'disconnect', listener: () => void): this;
  on(event: 'abort', listener: () => void): this;
  on(event: 'progress', listener: ITransferProgressEventListener): this;

  once(event: 'connect', listener: () => void): this;
  once(event: 'disconnect', listener: () => void): this;
  once(event: 'abort', listener: () => void): this;
}

export abstract class Strategy extends EventEmitter {
  public abstract readonly connected: boolean;

  private transfer: Transfer;

  public abstract connect: (config: any) => Promise<void>;

  public abstract disconnect: () => Promise<void>;

  public abstract abort: () => Promise<void>;

  public abstract download: (
    dest: Writable,
    remotePath: string,
    options?: ITransferOptions,
  ) => Promise<void>;

  public abstract upload: (
    source: Readable,
    remotePath: string,
    options?: ITransferOptions,
  ) => Promise<void>;

  public abstract list: (path?: string) => Promise<IFile[]>;

  public abstract size: (path: string) => Promise<number>;

  public abstract move: (source: string, dest: string) => Promise<void>;

  public abstract removeFile: (path: string) => Promise<void>;

  public abstract removeEmptyFolder: (path: string) => Promise<void>;

  public abstract removeFolder: (path: string) => Promise<void>;

  public abstract createFolder: (path: string) => Promise<void>;

  public abstract createEmptyFile: (path: string) => Promise<void>;

  public abstract pwd: () => Promise<string>;

  public abstract send: (command: string) => Promise<string>;

  constructor(protected readonly config: IConfig) {
    super();
  }

  protected prepareTransfer(
    info: ITransferRequestInfo,
    options?: ITransferOptions,
  ) {
    this.transfer = new Transfer(info, options, (data, progress) => {
      this.emit('progress', data, progress);
    });

    return this.transfer.handleProgress;
  }

  protected finishTransfer() {
    this.transfer = null;
  }
}

import { EventEmitter } from 'events';
import { Writable } from 'stream';

import { IFile, ITransferInfo, ITransferProgress } from '~/interfaces';
import { Transfer } from '~/transfer';

export declare interface StrategyBase {
  on(event: 'connect', listener: () => void): this;
  on(event: 'disconnect', listener: () => void): this;
  on(event: 'abort', listener: () => void): this;
  on(event: 'progress', listener: (e: ITransferProgress) => void): this;

  once(event: 'connect', listener: () => void): this;
  once(event: 'disconnect', listener: () => void): this;
  once(event: 'abort', listener: () => void): this;
}

export abstract class StrategyBase extends EventEmitter {
  public abstract readonly connected: boolean;

  private transfer: Transfer;

  public abstract connect: (config: any, options?: any) => Promise<void>;

  public abstract disconnect: () => Promise<void>;

  public abstract abort: () => Promise<void>;

  public abstract download: (
    dest: Writable,
    remotePath: string,
  ) => Promise<void>;

  public abstract readDir: (path?: string) => Promise<IFile[]>;

  public abstract size: (path?: string) => Promise<number>;

  protected prepareTransfer(info: ITransferInfo) {
    this.transfer = new Transfer(info, (e) => {
      this.emit('progress', e);
    });

    return this.transfer.handleProgress;
  }

  protected finishTransfer() {
    this.transfer = null;
  }
}

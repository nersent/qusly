import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';

import {
  IFile,
  ITransferOptions,
  ITransferProgressListener,
  ITransferInfo,
} from '~/interfaces';
import { Transfer } from '~/transfer';

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
  constructor(
    protected readonly config: any,
    protected readonly options?: any,
  ) {
    super();
  }

  public abstract connect(): Promise<void>;

  public abstract disconnect(): Promise<void>;

  public abstract list(path?: string): Promise<IFile[]>;

  public abstract size(path: string): Promise<number>;
}

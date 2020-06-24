import { EventEmitter } from 'events';

import { IFile } from '~/interfaces/file';

export declare interface StrategyBase {
  on(event: 'connect', listener: () => void): this;
  on(event: 'disconnect', listener: () => void): this;
  on(event: 'abort', listener: () => void): this;

  once(event: 'connect', listener: () => void): this;
  once(event: 'disconnect', listener: () => void): this;
  once(event: 'abort', listener: () => void): this;
}

export abstract class StrategyBase extends EventEmitter {
  public abstract readonly connected: boolean;

  public abstract connect: (config: any, options?: any) => Promise<void>;

  public abstract disconnect: () => Promise<void>;

  public abstract abort: () => Promise<void>;

  public abstract readDir: () => Promise<IFile[]>;
}

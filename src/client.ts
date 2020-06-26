import { EventEmitter } from 'events';
import { Writable } from 'stream';

import {
  IConfig,
  IOptions,
  IStrategiesMap,
  IFile,
  IClientWorkerGroup,
  IProgressEvent,
} from './interfaces';
import { StrategyBase } from './strategies/strategy-base';
import { TasksManager } from './tasks';
import { FtpStrategy } from './strategies/ftp';
import { repeat } from './utils/array';

export declare interface Client {
  on(event: 'connect', listener: () => void): this;
  on(event: 'disconnect', listener: () => void): this;
  on(event: 'abort', listener: () => void): this;
  on(event: 'progress', listener: (e: IProgressEvent) => void): this;

  once(event: 'connect', listener: () => void): this;
  once(event: 'disconnect', listener: () => void): this;
  once(event: 'abort', listener: () => void): this;
}

export class Client extends EventEmitter {
  protected workers: StrategyBase[] = [];

  protected tasks = new TasksManager<StrategyBase>();

  protected options: IOptions;

  protected strategies: IStrategiesMap = {
    ftp: FtpStrategy,
    ftps: FtpStrategy,
  };

  protected aborting = false;

  public transfers = new Map<number, number>(); // taskId, worker index

  constructor(protected config: IConfig, options?: IOptions) {
    super();

    this.options = { pool: 1, ...options };
    this.setWorkers();

    this.tasks.getWorkerInstance = this.getWorkerInstance;
    this.tasks.workerFilter = this.workerFilter;
  }

  protected createStrategy(): StrategyBase {
    const { protocol } = this.config;
    return new this.strategies[protocol]();
  }

  protected setWorkers() {
    const { pool } = this.options;

    for (let i = 0; i < pool; i++) {
      const instance = this.createStrategy();

      instance.on('progress', this._onProgress);

      this.workers.push(instance);
    }

    this.setWorkerGroups();
  }

  protected setWorkerGroups() {
    const { pool, transferPool } = this.options;
    const groups: IClientWorkerGroup[] = [];

    if (!transferPool || pool === 1) {
      groups.push(...repeat<IClientWorkerGroup>('all', pool));
    } else {
      groups.push('misc', ...repeat<IClientWorkerGroup>('transfer', pool - 1));
    }

    this.tasks.setWorkers(...groups);
  }

  protected getWorkerInstance = (index: number, group: IClientWorkerGroup) => {
    return this.workers[index];
  };

  protected workerFilter = (worker, group: IClientWorkerGroup) => {
    return (
      worker.group === 'all' ||
      (!group && worker.group === 'misc') ||
      worker.group === group
    );
  };

  public async connect() {
    await Promise.all(this.workers.map((r) => r.connect(this.config)));
  }

  public async disconnect() {
    await Promise.all(this.workers.map((r) => r.disconnect()));
  }

  public async abort() {
    if (!this.aborting) {
      this.aborting = true;
      this.tasks.pause();

      await Promise.all(this.workers.map((r) => r.abort()));

      this.tasks.resume();
      this.aborting = false;
    }
  }

  public async abortTransfer(id: number) {
    if (!Number.isSafeInteger(id)) {
      throw new Error('Invalid transfer id.');
    }

    const index = this.transfers.get(id);

    if (index == null) {
      throw new Error('Transfer not found.');
    }

    const instance = this.workers[index];

    this.tasks.pauseWorker(index);

    await instance.abort();

    this.tasks.resumeWorker(index);
  }

  public async download(dest: Writable, remotePath: string) {
    return await this.tasks.handle<void>(
      async ({ instance, workerIndex, taskId }) => {
        this.transfers.set(taskId, workerIndex);

        await instance.download(dest, remotePath, { id: taskId });

        this.transfers.delete(taskId);
      },
      'transfer',
    );
  }

  public async readDir(path?: string) {
    return await this.tasks.handle<IFile[]>(({ instance }) =>
      instance.readDir(path),
    );
  }

  private _onProgress = (e: IProgressEvent) => {
    this.emit('progress', e);
  };
}

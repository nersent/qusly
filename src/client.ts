import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';

import {
  IConfig,
  IOptions,
  IStrategiesMap,
  IFile,
  IClientWorkerGroup,
  ITransferProgressEventListener,
  ITransfer,
  ITaskHandler,
} from './interfaces';
import { StrategyBase } from './strategies/strategy-base';
import { TasksManager } from './tasks';
import { FtpStrategy } from './strategies/ftp';
import { repeat } from './utils/array';
import { getPathFromStream } from './utils/file';

export declare interface Client {
  on(event: 'connect', listener: () => void): this;
  on(event: 'disconnect', listener: () => void): this;
  on(event: 'abort', listener: () => void): this;
  on(event: 'transfer-new', listener: (e: ITransfer) => void): this;
  on(event: 'transfer-abort', listener: (transferId: number) => void): this;
  on(event: 'transfer-finish', listener: (e: ITransfer) => void): this;
  on(
    event: 'transfer-progress',
    listener: ITransferProgressEventListener,
  ): this;

  once(event: 'connect', listener: () => void): this;
  once(event: 'disconnect', listener: () => void): this;
  once(event: 'transfer-new', listener: (e: ITransfer) => void): this;
  once(event: 'transfer-abort', listener: (transferId: number) => void): this;
  once(event: 'transfer-finish', listener: (e: ITransfer) => void): this;
  once(
    event: 'transfer-progress',
    listener: ITransferProgressEventListener,
  ): this;
}

export class Client extends EventEmitter {
  protected workers: StrategyBase[] = [];

  protected tasks = new TasksManager<StrategyBase>();

  protected options: IOptions;

  protected strategies: IStrategiesMap = {
    ftp: FtpStrategy,
    ftps: FtpStrategy,
  };

  protected transfers = new Map<number, number>(); // task id => worker index;

  constructor(protected config: IConfig, options?: IOptions) {
    super();

    this.options = { pool: 1, ...options };
    this.setWorkers();

    this.tasks.getWorkerInstance = this.getWorkerInstance;
    this.tasks.workerFilter = this.workerFilter;
  }

  protected createWorker(): StrategyBase {
    const { protocol } = this.config;
    return new this.strategies[protocol](this.config);
  }

  protected setWorkers() {
    const { pool } = this.options;

    for (let i = 0; i < pool; i++) {
      const worker = this.createWorker();

      worker.on('progress', this._onProgress);

      this.workers.push(worker);
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

  protected getWorkerInstance = (index: number) => {
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
    [...this.transfers.keys()].forEach((r) => {
      this.emit('transfer-abort', r);
    });

    this.tasks.deleteAllTasks();

    await Promise.all(this.workers.map((r) => r.abort()));
  }

  public async abortTransfer(...transferIds: number[]) {
    const workerIndexes: number[] = [];
    const instances: StrategyBase[] = [];

    transferIds.forEach((id) => {
      const workerIndex = this.transfers.get(id);

      if (workerIndex != null) {
        instances.push(this.workers[workerIndex]);
      }

      workerIndexes.push(workerIndex);

      this.emit('transfer-abort', id);
    });

    this.tasks.deleteTasks(...transferIds);
    this.tasks.pauseWorkers(...workerIndexes);

    await Promise.all(instances.map((r) => r.abort()));

    this.tasks.resumeWorkers(...workerIndexes);
  }

  public download(dest: Writable, remotePath: string) {
    return this.handleTransfer(
      ({ instance, taskId }) =>
        instance.download(dest, remotePath, { id: taskId }),
      dest,
      remotePath,
    );
  }

  public async readDir(path?: string) {
    return await this.tasks.handle<IFile[]>(({ instance }) =>
      instance.readDir(path),
    );
  }

  protected _onProgress = (data, progress) => {
    this.emit('transfer-progress', data, progress);
  };

  protected async handleTransfer(
    fn: ITaskHandler<StrategyBase>,
    stream: Writable | Readable,
    remotePath: string,
  ) {
    const localPath = getPathFromStream(stream);
    const taskId = this.tasks.createTaskId();
    const transfer: ITransfer = { id: taskId, localPath, remotePath };

    this.transfers.set(taskId, null);
    this.emit('transfer-new', transfer);

    try {
      await this.tasks.handle<void>(
        async (e) => {
          this.transfers.set(taskId, e.workerIndex);

          await fn(e);
        },
        'transfer-transfer',
        taskId,
      );
    } catch (err) {
      throw new err();
    } finally {
      this.transfers.delete(taskId);
      this.emit('transfer-finish', transfer);
    }
  }
}

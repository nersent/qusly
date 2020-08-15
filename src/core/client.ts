import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';

import {
  IFtpConfig,
  IFtpOptions,
  ISFtpConfig,
  ISFtpOptions,
  IConfig,
  IOptions,
  IClientOptions,
  ITransfer,
  ITransferProgress,
  ITransferDirection,
  ITransferProgressListener,
} from '~/interfaces';
import { StrategyManager } from './strategies/strategy-manager';
import { TaskManager } from '~/common/tasks/task-manager';
import { WorkerManagerImpl } from './tasks/worker-manager-impl';
import { Strategy } from '~/strategies/strategy';
import { ClientInvokerFactory } from './client-invoker-factory';
import { useWriteStream, useReadStream } from './utils/stream';
import { TaskWorkerImpl } from './tasks/task-worker-impl';
import { TaskGroup } from './constants/task-group';
import { getFileSize } from '~/utils/file';
import { IClientTransferHandler } from './interfaces';

type IClientEvents =
  | 'connect'
  | 'disconnect'
  | 'transfer-new'
  | 'transfer-abort'
  | 'transfer-finish'
  | 'transfer-progress';

export declare interface Client {
  on(event: 'connect', listener: () => void): this;
  on(event: 'disconnect', listener: () => void): this;
  on(event: 'transfer-new', listener: (e: ITransfer) => void): this;
  on(event: 'transfer-abort', listener: (...ids: number[]) => void): this;
  on(event: 'transfer-finish', listener: (e: ITransfer) => void): this;
  on(event: 'transfer-progress', listener: ITransferProgressListener): this;

  once(event: 'connect', listener: () => void): this;
  once(event: 'disconnect', listener: () => void): this;
  once(event: 'transfer-new', listener: (e: ITransfer) => void): this;
  once(event: 'transfer-abort', listener: (...ids: number[]) => void): this;
  once(event: 'transfer-finish', listener: (e: ITransfer) => void): this;
  once(event: 'transfer-progress', listener: ITransferProgressListener): this;

  addListener(event: IClientEvents, listener: Function): this;
  removeListener(event: IClientEvents, listener: Function): this;
}

export class Client extends EventEmitter {
  protected _options: IClientOptions;

  protected _config?: IConfig;

  protected _connectionOptions?: IOptions;

  private workerManager = new WorkerManagerImpl(this);

  private taskManager = new TaskManager(this.workerManager);

  private invoker = ClientInvokerFactory.create(this.taskManager);

  private transfers = new Map<number, TaskWorkerImpl>();

  public get options() {
    return this._options;
  }

  /**
   * Previously set config.
   */
  public get config() {
    return this._config;
  }

  public get connectionOptions() {
    return this._connectionOptions;
  }

  constructor(options?: IClientOptions) {
    super();

    this._options = { pool: 1, ...options };
  }

  protected onConnect = () => {
    this.emit('connect');
  };

  protected onDisconnect = () => {
    this.emit('disconnect');
  };

  protected onProgress = (data, progress) => {
    this.emit('transfer-progress', data, progress);
  };

  protected getStrategy(protocol: string): typeof Strategy {
    return StrategyManager.get(protocol);
  }

  private addWorkerEvents = (worker: TaskWorkerImpl) => {
    const { instance } = worker;

    instance.on('connect', this.onConnect);
    instance.on('disconnect', this.onDisconnect);
    instance.on('progress', this.onProgress);
  };

  private removeWorkerEvents = (worker: TaskWorkerImpl) => {
    const { instance } = worker;

    instance.removeListener('connect', this.onConnect);
    instance.removeListener('disconnect', this.onDisconnect);
    instance.removeListener('progress', this.onProgress);
  };

  public async connect(config?: IFtpConfig, options?: IFtpOptions);
  public async connect(config?: ISFtpConfig, options?: ISFtpOptions);
  public async connect(config?: IConfig, options?: IOptions) {
    if (!this._config && !config) {
      throw new Error('Config must be provided!');
    }

    await this.disconnect();

    if (config) this._config = config;
    if (options) this._connectionOptions = options;

    this.workerManager.workers.forEach(this.removeWorkerEvents);
    this.workerManager.prepare(this.getStrategy(config.protocol));
    this.workerManager.workers.forEach(this.addWorkerEvents);

    await this.workerManager.connectWorkers();
  }

  public disconnect() {
    return this.workerManager.disconnectWorkers();
  }

  public async abort() {
    this.emit('transfer-abort', ...this.transfers.keys());

    this.taskManager.clear();

    await Promise.all(
      this.workerManager.workers.map((r) => r.instance.abort()),
    );
  }

  public async abortTransfers(...ids: number[]) {
    const workers: TaskWorkerImpl[] = [];

    ids.forEach((id) => {
      const worker = this.transfers.get(id);

      workers.push(worker);

      worker.paused = true;
    });

    this.taskManager.cancelTasks(...ids);

    await Promise.all(workers.map((r) => r.instance.abort()));

    workers.forEach((r) => (r.paused = false));
    this.taskManager.handleNext();
  }

  public async download(
    dest: Writable | string,
    remotePath: string,
    startAt?: number,
  ) {
    const { stream, localPath } = useWriteStream(dest, startAt);

    return this.handleTransfer(
      async (instance: Strategy, info: ITransfer) => {
        await instance.download(stream, {
          ...info,
          startAt,
          totalBytes: await instance.size(remotePath),
        });
      },
      { remotePath, localPath },
    );
  }

  public upload(source: Readable | string, remotePath: string) {
    const { stream, localPath } = useReadStream(source);

    return this.handleTransfer(
      async (instance, info) => {
        await instance.upload(stream, {
          ...info,
          totalBytes: await getFileSize(localPath),
        });
      },
      { remotePath, localPath },
    );
  }

  public list = this.invoker('list');

  public size = this.invoker('size');

  protected async handleTransfer(
    fn: IClientTransferHandler,
    direction: ITransferDirection,
  ) {
    const taskId = this.taskManager.createTaskId();
    const transfer: ITransfer = { id: taskId, ...direction };

    this.transfers.set(taskId, null);
    this.emit('transfer-new', transfer);

    try {
      await this.taskManager.enqueue(
        async (instance, worker: TaskWorkerImpl) => {
          this.transfers.set(taskId, worker);

          await fn(instance, transfer);
        },
        { id: taskId, group: TaskGroup.Transfer },
      );
    } catch (err) {
      throw err;
    } finally {
      this.transfers.delete(taskId);
      this.emit('transfer-finish', transfer);
    }
  }
}

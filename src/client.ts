import { EventEmitter } from 'events';
import { Writable } from 'stream';

import {
  IConfig,
  IOptions,
  IStrategiesMap,
  IFile,
  IClientWorkerGroup,
} from './interfaces';
import { StrategyBase } from './strategies/strategy-base';
import { TasksManager } from './tasks';
import { FtpStrategy } from './strategies/ftp';
import { repeat } from './utils/array';

export class Client extends EventEmitter {
  protected workers: StrategyBase[] = [];

  protected tasks = new TasksManager<StrategyBase>();

  protected options: IOptions;

  protected strategies: IStrategiesMap = {
    ftp: FtpStrategy,
    ftps: FtpStrategy,
  };

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

      instance.on('progress', (r) => {
        if (r.percent === 100) {
          console.log(`${r.remotePath}: ${r.percent}%`);
        }
      });

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

  public async download(dest: Writable, remotePath: string) {
    return await this.tasks.handle<void>(
      (client) => client.download(dest, remotePath),
      'transfer',
    );
  }

  public async readDir(path?: string) {
    return await this.tasks.handle<IFile[]>((client) => client.readDir(path));
  }
}

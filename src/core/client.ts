import { EventEmitter } from 'events';

import { TaskFactory } from './tasks/task-factory';
import {
  IFtpConfig,
  IFtpOptions,
  ISFtpConfig,
  ISFtpOptions,
  IConfig,
  IOptions,
  IClientOptions,
} from '~/interfaces';
import { StrategyManager } from './strategies/strategy-manager';
import { TaskManager } from '~/common/tasks/task-manager';
import { WorkerManagerImpl } from './tasks/worker-manager-impl';
import { Strategy } from '~/strategies/strategy';

export class Client extends EventEmitter {
  protected _config?: IConfig;

  protected _connectionOptions?: IOptions;

  protected options: IClientOptions;

  private workerManager = new WorkerManagerImpl();

  private taskManager = new TaskManager(this.workerManager);

  private taskFactory = TaskFactory.create(this.taskManager);

  /**
   * Previously set config.
   */
  public get config() {
    return this._config;
  }

  constructor(options?: IClientOptions) {
    super();

    this.options = { pool: 1, ...options };
  }

  protected getStrategy(protocol: string): typeof Strategy {
    return StrategyManager.get(protocol);
  }

  public async connect(config?: IFtpConfig, options?: IFtpOptions);
  public async connect(config?: ISFtpConfig, options?: ISFtpOptions);
  public async connect(config?: IConfig, options?: IOptions) {
    if (!this._config && !config) {
      throw new Error('Config must be provided!');
    }

    // await this.disconnect();

    if (config) this._config = config;
    if (options) this._connectionOptions = options;

    this.workerManager.prepare(
      this.options,
      this._config,
      this._connectionOptions,
      this.getStrategy(config.protocol),
    );

    await Promise.all(
      this.workerManager.workers.map((r) => r.instance.connect()),
    );
  }

  public list = this.taskFactory('list');
}

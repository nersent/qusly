import { EventEmitter } from 'events';

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
import { ClientInvokerFactory } from './client-invoker-factory';

export class Client extends EventEmitter {
  protected _options: IClientOptions;

  protected _config?: IConfig;

  protected _connectionOptions?: IOptions;

  private workerManager = new WorkerManagerImpl(this);

  private taskManager = new TaskManager(this.workerManager);

  private invoker = ClientInvokerFactory.create(this.taskManager);

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

  protected getStrategy(protocol: string): typeof Strategy {
    return StrategyManager.get(protocol);
  }

  public async connect(config?: IFtpConfig, options?: IFtpOptions);
  public async connect(config?: ISFtpConfig, options?: ISFtpOptions);
  public async connect(config?: IConfig, options?: IOptions) {
    if (!this._config && !config) {
      throw new Error('Config must be provided!');
    }

    await this.disconnect();

    if (config) this._config = config;
    if (options) this._connectionOptions = options;

    this.workerManager.prepare(this.getStrategy(config.protocol));

    await Promise.all(
      this.workerManager.workers.map((r) => r.instance.connect()),
    );
  }

  public async disconnect() {
    await Promise.all(
      this.workerManager.workers.map((r) => r.instance.disconnect()),
    );
  }

  public list = this.invoker('list');
}

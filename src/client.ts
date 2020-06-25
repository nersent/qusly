import { EventEmitter } from 'events';

import { IConfig, IOptions } from './interfaces';
import { StrategyBase } from './strategies/strategy-base';
import { TasksManager } from './tasks';

const timer = (message: string, time = 500) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(message);
      resolve();
    }, time);
  });
};

export class Client extends EventEmitter {
  protected workers: string[] = ['1', '2', '4', '5'];

  protected tasks = new TasksManager<string>();

  constructor() {
    // public config: IConfig, public options?: IOptions
    super();

    this.tasks.setWorkers('all', 'transfer', 'all');

    this.tasks.getWorkerInstance = (index) => this.workers[index];
  }

  public async readDir(path: string) {
    await this.tasks.handle((client) => timer(`${client} ${path}`), 'all');
  }
}

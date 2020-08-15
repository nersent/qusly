import { WorkerManager } from '~/common/tasks/worker-manager';
import { TaskWorker } from '~/common/tasks/task-worker';
import { TaskWorkerImpl } from './task-worker-impl';
import { Strategy } from '~/strategies/strategy';
import { IClientOptions } from '~/interfaces';
import { TaskGroup } from '../constants/task-group';
import { Client } from '../client';

export class WorkerManagerImpl extends WorkerManager {
  public workers: TaskWorkerImpl[] = [];

  constructor(private client: Client) {
    super();
  }

  public check() {
    return this.workers.length !== 0;
  }

  public getAvailable(group: number): TaskWorker {
    return this.workers.find((r) => r.isAvailable(group));
  }

  public getAllBusy() {
    return this.workers.filter((r) => r.busy);
  }

  public prepare(strategy: typeof Strategy) {
    const { options, config, connectionOptions } = this.client;

    for (let i = 0; i < options.pool; i++) {
      const instance = new (strategy as any)(config, connectionOptions);
      const group = this.getWorkerGroup(i, options);

      const worker = new TaskWorkerImpl(instance, group);

      this.workers.push(worker);
    }
  }

  protected getWorkerGroup(
    index: number,
    { pool, transferPool }: IClientOptions,
  ) {
    if (!transferPool || pool === 1) {
      return TaskGroup.All;
    }

    return index === 0 ? TaskGroup.Misc : TaskGroup.Transfer;
  }

  public connectWorkers() {
    return Promise.all(this.workers.map((r) => r.instance.connect()));
  }

  public disconnectWorkers() {
    return Promise.all(this.workers.map((r) => r.instance.disconnect()));
  }
}

import { EventEmitter } from 'events';

import {
  ITask,
  ITaskChange,
  ITaskWorker,
  ITasksGroupFilter,
  ITaskHandlerEvent,
} from './interfaces/task';
import { execFunction } from './utils/function';

export declare interface TasksManager {
  on(event: 'change', listener: (e: ITaskChange) => void): this;
}

const DEFAULT_GROUP_FILTER: ITasksGroupFilter = (worker, group) =>
  worker.group === group;

export class TasksManager<K = number> extends EventEmitter {
  private workers: ITaskWorker[] = [];

  protected queue: ITask[] = [];

  protected taskCounter = 0;

  protected paused = false;

  public workerFilter: ITasksGroupFilter;

  public getWorkerInstance: (index: number, group: string) => K;

  protected getWorker(group: string) {
    const filter = this.workerFilter || DEFAULT_GROUP_FILTER;

    return this.workers.find((r) => !r.busy && filter(r, group));
  }

  public setWorkers(...workers: string[]) {
    this.workers = workers.map((group, index) => ({
      busy: false,
      group,
      index,
    }));
  }

  public async handle<T>(
    fn: (e: ITaskHandlerEvent<K>) => any,
    group?: string,
  ): Promise<T> {
    this.workersCheck();

    return new Promise((resolve, reject) => {
      const taskId = this.taskCounter++;

      const task: ITask = { id: taskId, fn, group };

      const listener = (e: ITaskChange) => {
        if (e.taskId === taskId) {
          this.removeListener('change', listener);

          if (e.error) return reject(e.error);
          resolve(e.data);
        }
      };

      this.on('change', listener);
      this.process(task);
    });
  }

  protected process = async (task: ITask) => {
    const worker = this.getWorker(task.group);

    if (worker && !this.paused && !worker.paused) {
      worker.busy = true;

      const instance = this.getWorkerInstance
        ? this.getWorkerInstance(worker.index, task.group)
        : worker.index;

      const res = await execFunction(task.fn, {
        instance,
        taskId: task.id,
        workerIndex: worker.index,
      } as ITaskHandlerEvent<K>);

      worker.busy = false;

      this.emit('change', {
        ...res,
        taskId: task.id,
        type: 'finished',
      } as ITaskChange);

      this.processNext();
    } else {
      this.queue.push(task);
    }
  };

  protected async processNext() {
    if (!this.paused && this.queue.length) {
      const count = this.workers.filter((r) => !r.busy && !r.paused).length;
      const tasks = this.queue.splice(0, count);

      tasks.forEach(this.process);
    }
  }

  protected workersCheck() {
    if (!this.workers.length) {
      throw new Error('No workers available.');
    }
  }

  public pause() {
    this.paused = true;
  }

  public resume() {
    this.paused = false;
    this.processNext();
  }

  public pauseWorker(index: number) {
    this.workers[index].paused = true;
  }

  public resumeWorker(index: number) {
    this.workers[index].paused = false;
    this.processNext();
  }
}

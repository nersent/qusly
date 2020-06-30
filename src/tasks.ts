import { EventEmitter } from 'events';

import {
  ITask,
  ITaskChange,
  ITaskWorker,
  ITasksGroupFilter,
  ITaskHandlerEvent,
  ITaskHandler,
} from './interfaces';
import { execFunction } from './utils/function';

export declare interface TasksManager {
  on(event: 'change', listener: (e: ITaskChange) => void): this;
}

const DEFAULT_GROUP_FILTER: ITasksGroupFilter = (worker, group) =>
  worker.group === group;

export class TasksManager<K = number> extends EventEmitter {
  private workers: ITaskWorker[] = [];

  protected queue: ITask[] = [];

  protected taskCounter = -1;

  protected unavailableWorkers = 0;

  public workerFilter: ITasksGroupFilter;

  public getWorkerInstance: (index: number, group: string) => K;

  protected getWorker(group: string) {
    if (this.unavailableWorkers === this.workers.length) {
      return null;
    }

    const filter = this.workerFilter || DEFAULT_GROUP_FILTER;

    return this.workers.find((r) => !r.busy && !r.paused && filter(r, group));
  }

  protected getWorkers(indexes?: number[]) {
    if (!indexes?.length) return this.workers;
    return indexes.map((r) => this.workers[r]);
  }

  public setWorkers(...workers: string[]) {
    this.workers = workers.map((group, index) => ({
      busy: false,
      group,
      index,
    }));
  }

  public async handle<T = void>(
    fn: ITaskHandler<K>,
    group?: string,
    taskId?: number,
  ): Promise<T> {
    this.workersCheck();

    return new Promise((resolve, reject) => {
      const task: ITask = {
        id: taskId ?? this.createTaskId(),
        fn,
        group,
      };

      const listener = (e: ITaskChange) => {
        if (e.taskId === task.id) {
          this.removeListener('change', listener);

          if (e.error) return reject(e.error);
          resolve(e.data);
        }
      };

      this.on('change', listener);
      this.process(task);
    });
  }

  protected process = async (task: ITask, worker?: ITaskWorker) => {
    worker = worker || this.getWorker(task.group);

    if (worker) {
      worker.busy = true;
      this.unavailableWorkers++;

      const instance = this.getWorkerInstance
        ? this.getWorkerInstance(worker.index, task.group)
        : worker.index;

      const { data, error } = await execFunction(task.fn, {
        instance,
        taskId: task.id,
        workerIndex: worker.index,
      } as ITaskHandlerEvent<K>);

      worker.busy = false;
      this.unavailableWorkers--;

      this.finishTask(task.id, data, error);
      this.processNext();
    } else {
      this.queue.push(task);
    }
  };

  protected async processNext() {
    if (this.queue.length) {
      const queue = [];

      for (const task of this.queue) {
        const worker = this.getWorker(task.group);

        if (worker) {
          this.process(task, worker);
        } else {
          queue.push(task);
        }
      }

      this.queue = queue;
    }
  }

  protected workersCheck() {
    if (!this.workers.length) {
      throw new Error('No workers set');
    }
  }

  public pauseWorkers(...indexes: number[]) {
    this.unavailableWorkers += indexes.length;

    this.getWorkers(indexes).forEach((r) => (r.paused = true));
  }

  public resumeWorkers(...indexes: number[]) {
    this.unavailableWorkers -= indexes.length;

    this.getWorkers(indexes).forEach((r) => (r.paused = false));
    this.processNext();
  }

  public deleteTasks(...ids: number[]) {
    const queue: ITask[] = [];

    this.queue.forEach((task) => {
      if (ids.includes(task.id)) {
        this.finishTask(task.id);
      } else {
        queue.push(task);
      }
    });

    this.queue = queue;
  }

  public deleteAllTasks() {
    this.queue.forEach((r) => this.finishTask(r.id));
    this.queue = [];
  }

  public createTaskId() {
    return ++this.taskCounter;
  }

  protected finishTask(id: number, data?: any, error?: Error) {
    this.emit('change', {
      taskId: id,
      data,
      error,
      type: 'finished',
    } as ITaskChange);
  }
}

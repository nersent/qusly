import { ITask, ITaskCreateOptions } from '~/common/interfaces';
import { TaskWorker } from './task-worker';
import { WorkerManager } from './worker-manager';

export class TaskManager {
  private queue: ITask[] = [];

  private static taskIdCounter = 0;

  constructor(protected workerManager: WorkerManager) {}

  protected createTaskId() {
    return TaskManager.taskIdCounter++;
  }

  protected createTask(
    fn: Function,
    resolve: Function,
    reject: Function,
    options?: ITaskCreateOptions,
  ): ITask {
    return {
      id: options?.id ?? this.createTaskId(),
      group: options?.group,
      fn,
      resolve,
      reject,
    };
  }

  public enqueue<T>(fn: Function, options?: ITaskCreateOptions): Promise<T> {
    if (typeof fn !== 'function') {
      throw new Error('Invalid function');
    }

    if (!this.workerManager.check(options?.group)) {
      throw new Error('No workers set');
    }

    return new Promise((resolve, reject) => {
      const task = this.createTask(fn, resolve, reject, options);

      this.handle(task);
    });
  }

  private async handle(task: ITask, _worker?: TaskWorker) {
    if (!task) {
      throw new Error('Invalid task');
    }

    const worker = _worker || this.workerManager.getAvailable(task.group);

    if (worker) {
      worker.busy = true;

      try {
        const res = await worker.handle(task);

        task.resolve(res);
      } catch (err) {
        task.reject(err);
      }

      worker.busy = false;
      this.handleNext();
    } else {
      this.queue.push(task);
    }
  }

  public handleNext() {
    if (!this.queue.length) return;

    const queue = [];

    this.queue.forEach((task) => {
      const worker = this.workerManager.getAvailable(task.group);

      if (worker) {
        this.handle(task, worker);
      } else {
        queue.push(task);
      }
    });

    this.queue = queue;
  }
}

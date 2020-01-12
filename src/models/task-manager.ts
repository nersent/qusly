import { EventEmitter } from 'events';

import { makeId, safeExec } from '../utils';
import { ITask, ITaskResponse, ITaskCallback, ITaskFilter } from '../interfaces';

export class TaskManager extends EventEmitter {
  protected _queue: ITask[] = [];

  protected _usedThreads = 0;

  protected _indexies: boolean[] = [];

  constructor(public threads = 1) {
    super();
    this._indexies.length = threads;
  }

  public handle<T>(f: ITaskCallback, id?: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const _id = id || makeId(32);

      this._queue.push({ id: _id, cb: f as any, status: 'pending', data });

      const completeEvent = `complete-${_id}`;
      const abortEvent = `abort-${_id}`;

      const onComplete = ({ data, error }: ITaskResponse) => {
        this.removeListener(abortEvent, onAbort);
        if (error) return reject(error);
        resolve(data);
      }

      const onAbort = () => {
        this.removeListener(completeEvent, onComplete);
        resolve();
      }

      this.once(completeEvent, onComplete);
      this.once(abortEvent, onAbort);

      if (this.available) {
        this._process(_id);
      }
    });
  }

  public get available() {
    return this._usedThreads < this.threads;
  }

  protected async _process(task: string | ITask) {
    const _task = typeof task === 'string' ? this._queue.find(r => r.id === task) : task;
    const index = this._reserve();

    switch (_task.status) {
      case 'busy': throw new Error('Task is already executed!');
      case 'finished': throw new Error('Task is already finished!');
      case 'deleted': throw new Error('Task is deleted!');
    }

    this._usedThreads++;
    _task.status = 'busy';

    const res = await safeExec(_task.cb, _task.id, index);

    this._usedThreads--;
    this._free(index);

    _task.status = 'finished';

    this.emit(`complete-${_task.id}`, res);
    this._next();
  }

  protected _next() {
    const task = this._queue.find(r => r.status === 'pending');

    if (task) {
      this._process(task);
    } else if (this._usedThreads === 0) {
      this._clearQueue();
    }
  }

  protected _clearQueue() {
    this._queue = [];
  }

  public delete(taskId: string) {
    const task = this._queue.find(r => r.id === taskId);

    switch (task.status) {
      case 'busy': throw new Error('Cannot delete task while it\'s executing!');
      case 'finished': throw new Error('Cannot delete finished task!');
      case 'deleted': throw new Error('Cannot delete removed task!');
    }

    task.status = 'deleted';
  }

  public deleteAll(filter?: ITaskFilter) {
    this._queue.forEach(r => {
      if (r.status === 'pending') {
        if (!filter || filter(r)) {
          r.status = 'deleted';
          this.emit(`abort-${r.id}`);
        }
      }
    });
  }

  protected _reserve() {
    const index = this._indexies.findIndex(r => !r);

    if (index === -1) {
      throw new Error();
    }

    this._indexies[index] = true;

    return index;
  }

  protected _free(index: number) {
    this._indexies[index] = false;
  }
}

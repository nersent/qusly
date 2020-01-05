import { EventEmitter } from 'events';

import { makeId, safeExec } from '../utils';
import { ITask, ITaskResponse } from '../interfaces';

export class TaskManager extends EventEmitter {
  protected _queue: ITask[] = [];

  protected _usedThreads = 0;

  constructor(public threads = 1) {
    super();
  }

  public handle<T>(f: Function, id?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const _id = id || makeId(32);

      this._queue.push({ id: _id, cb: f as any, status: 'pending' });

      this.once(`complete-${_id}`, ({ data, error }: ITaskResponse) => {
        if (error) return reject(error);
        resolve(data);
      });

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

    switch (_task.status) {
      case 'busy': throw new Error('Task is already executed!');
      case 'finished': throw new Error('Task is already finished!');
      case 'deleted': throw new Error('Task is deleted!');
    }

    this._usedThreads++;
    _task.status = 'busy';

    const res = await safeExec(_task.cb, _task.id);

    this._usedThreads--;
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
}

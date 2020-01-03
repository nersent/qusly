import { EventEmitter } from 'events';

import { makeId } from '../utils';

interface IQueueItem {
  id: any;
  f: Function;
}

interface ITask<T> {
  id: any;
  callback: Promise<T>
}

export class TaskManager extends EventEmitter {
  protected _queue: IQueueItem[] = [];

  protected _tasksCount = 0;

  protected _reserved = 0;

  constructor(public splits = 1) {
    super();
  }

  protected get _available() {
    return this._tasksCount < this.splits - this._reserved;
  }

  public handle<T>(f: any, id?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      id = id || makeId(32);

      this._queue.push({ id, f });

      this.once(`complete-${id}`, (data, error) => {
        if (error) return reject(error);
        resolve(data);
      });

      if (this._available) {
        this._exec(id);
      }
    });
  }

  protected async _exec(taskId: string) {
    if (!taskId || !this._queue.length) return;

    this._tasksCount++;

    const queueIndex = this._queue.findIndex(r => r.id === taskId);
    const { id, f } = this._queue[queueIndex];

    this._queue.splice(queueIndex, 1);

    let response: any;
    let error: Error;

    try {
      console.log(this._queue);
      response = await f(this._tasksCount - 1);
    } catch (err) {
      error = err;
    }

    this._tasksCount--;
    this.emit(`complete-${id}`, response, error);

    if (this._queue.length) {
      this._exec(this._queue[0].id);
    }
  }

  /**
   * __Works only with pending tasks!__
   */
  public cancel(taskId: string) {
    this._queue = this._queue.filter(r => r.id !== taskId);
  }

  public reserve() {
    if (++this._reserved > this.splits) {
      throw new Error('Can\'t reserve more clients!');
    }
  }

  public free() {
    if (--this._reserved < 0) {
      this._reserved = 0;
    }
  }
}

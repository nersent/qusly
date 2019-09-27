import { EventEmitter } from 'events';

import { makeId } from '../utils';

interface IQueueItem {
  id: string;
  f: Function;
  args: any[];
}

export class TaskManager extends EventEmitter {
  protected _queue: IQueueItem[] = [];

  protected _taskId: string;

  public handle<T>(f: Function, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = makeId(32);

      this._queue.push({ id, f, args });

      this.once(`complete-${id}`, (data, error) => {
        if (error) return reject(error);
        resolve(data);
      });

      if (!this._taskId) {
        this._taskId = id;
        this._exec();
      }
    });
  }

  protected async _exec() {
    if (!this._taskId || !this._queue.length) return;

    const { id, f, args } = this._queue[0];

    if (id === this._taskId) {
      let response: any;
      let error: Error;

      try {
        response = await f(...args);
      } catch (err) {
        error = err;
      }

      this._queue.shift();
      this._taskId = this._queue.length && this._queue[0].id;

      this.emit(`complete-${id}`, response, error);
      this._exec();
    }
  }
}

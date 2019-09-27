import { EventEmitter } from 'events';

import { makeId } from '../utils';

interface IQueueItem {
  id: string;
  f: Function;
  args: any[];
}

export class TaskManager extends EventEmitter {
  protected queue: IQueueItem[] = [];

  protected taskId: string;

  public handle<T>(f: Function, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = makeId(32);

      this.queue.push({ id, f, args });

      this.once(`complete-${id}`, (data, error) => {
        if (error) return reject(error);
        resolve(data);
      });

      if (!this.taskId) {
        this.taskId = id;
        this.exec();
      }
    });
  }

  protected async exec() {
    if (!this.taskId || !this.queue.length) return;

    const { id, f, args } = this.queue[0];

    if (id === this.taskId) {
      let response: any;
      let error: Error;

      try {
        response = await f(...args);
      } catch (err) {
        error = err;
      }

      this.queue.shift();
      this.taskId = this.queue.length && this.queue[0].id;

      this.emit(`complete-${id}`, response, error);
      this.exec();
    }
  }
}

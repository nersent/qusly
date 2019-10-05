import { createWriteStream } from 'fs';

import { IConfig } from '../interfaces';
import { Client } from './client';
import { TaskManager } from './task-manager';

export class TransferClient {
  private _clients: Client[] = [];

  private _tasks: TaskManager;

  constructor(private _config: IConfig, public type: 'download' | 'upload', private _splits = 1) {
    this._tasks = new TaskManager(_splits);
    this.setSplits(_splits);
  }

  public async connect() {
    const promises = this._clients.map(r => r.connect(this._config));
    await Promise.all(promises);
  }

  public async setSplits(count: number, connect = false) {
    this._tasks.splits = count;

    const length = this._clients.length;

    if (count > length) {
      for (let i = length; i < count; i++) {
        this._clients[i] = new Client();
      }

      if (connect) await this.connect();
    } else if (count < length) {
      const deleted = this._clients.splice(0, length - count);
      await Promise.all(deleted.map(r => r.disconnect));
    }
  }

  public async transfer(localPath: string, remotePath: string) {
    return this._tasks.handle(index => {
      console.log(index);

      if (this.type === 'download') {
        return this._clients[index].download(remotePath, createWriteStream(localPath, 'utf8'));
      }

      return null;
    });
  }
}

import { createWriteStream, createReadStream } from 'fs';
import { EventEmitter } from 'events';

import { IConfig, ITransferClientNew, ITransferClientProgress, ITransferType } from '../interfaces';
import { Client } from './client';
import { TaskManager } from './task-manager';
import { makeId } from '../utils';

export declare interface TransferClient {
  on(event: 'new', listener: (e: ITransferClientNew) => void): this;
  on(event: 'progress', listener: (e: ITransferClientProgress) => void): this;
  once(event: 'new', listener: (e: ITransferClientNew) => void): this;
  once(event: 'progress', listener: (e: ITransferClientProgress) => void): this;
}

export class TransferClient extends EventEmitter {
  private _clients: Client[] = [];

  private _tasks: TaskManager;

  constructor(public type: ITransferType, private _splits = 1) {
    super();

    this._tasks = new TaskManager(_splits);
    this.setSplits(_splits);
  }

  public async connect(config: IConfig) {
    const promises = this._clients.map(r => r.connect(config));
    await Promise.all(promises);
  }

  public getSplits() {
    return this._clients.length;
  }

  public async setSplits(count: number, config?: IConfig) {
    this._tasks.splits = count;

    const length = this._clients.length;

    if (count > length) {
      for (let i = length; i < count; i++) {
        this._clients[i] = new Client();
      }

      if (config) {
        await this.connect(config);
      } else {
        throw new Error('You must provide config!');
      }
    } else if (count < length) {
      const deleted = this._clients.splice(0, length - count);
      await Promise.all(deleted.map(r => r.disconnect));
    }
  }

  public transfer(localPath: string, remotePath: string, id?: string) {
    return this._tasks.handle<void>(index => {
      console.log(index);

      id = id || makeId(32);

      const client = this._clients[index];

      this.emit('new', {
        id,
        localPath,
        remotePath,
        type: this.type,
        context: client,
      } as ITransferClientNew);

      client.on('progress', e => {
        const data = { ...e, id, type: this.type } as ITransferClientProgress;
        this.emit('progress', data);
      });

      if (this.type === 'download') {
        return client.download(remotePath, createWriteStream(localPath, 'utf8'));
      }

      return client.upload(remotePath, createReadStream(localPath, 'utf8'));
    });
  }
}

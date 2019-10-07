import { createWriteStream, createReadStream } from 'fs';
import { EventEmitter } from 'events';

import { IConfig, ITransferClientItem, ITransferType } from '../interfaces';
import { Client } from './client';
import { TaskManager } from './task-manager';
import { makeId, ensureExists } from '../utils';

export declare interface TransferClient {
  on(event: 'new', listener: (e: ITransferClientItem) => void): this;
  on(event: 'progress', listener: (e: ITransferClientItem) => void): this;
  on(event: 'finish', listener: (e: ITransferClientItem) => void): this;
  once(event: 'new', listener: (e: ITransferClientItem) => void): this;
  once(event: 'progress', listener: (e: ITransferClientItem) => void): this;
  once(event: 'finish', listener: (e: ITransferClientItem) => void): this;
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

      if (config) await this.connect(config);
    } else if (count < length) {
      const deleted = this._clients.splice(0, length - count);
      await Promise.all(deleted.map(r => r.disconnect));
    }
  }

  public async transfer(localPath: string, remotePath: string, id?: string) {
    return this._tasks.handle<void>(async (index) => {
      id = id || makeId(32);

      await ensureExists(localPath);

      const client = this._clients[index];

      let item: ITransferClientItem = {
        id,
        localPath,
        remotePath,
        type: this.type,
        context: client,
        speed: 0,
        buffered: 0,
        chunkSize: 0,
        eta: 0,
        size: 0,
        status: 'pending',
      };

      this.emit('new', item);

      client.on('progress', e => {
        item = { ...e, status: 'transfering' };

        this.emit('progress', item);
      });

      if (this.type === 'download') {
        await client.download(remotePath, createWriteStream(localPath, 'utf8'));
      }

      await client.upload(remotePath, createReadStream(localPath, 'utf8'));

      item.status = 'finished';

      this.emit('finish', item);
    });
  }
}

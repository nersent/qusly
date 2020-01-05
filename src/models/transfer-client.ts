import { EventEmitter } from 'events';
import { createWriteStream } from 'fs';

import { IConfig, IParallelTransferInfo, ITransferProgress, ITransferStatus } from '../interfaces';
import { Client } from './client';
import { TaskManager } from './task-manager';
import { makeId, ensureExists } from '../utils';

export declare interface TransferClient {
  on(event: 'new', listener: (info: IParallelTransferInfo) => void): this;
  on(event: 'progress', listener: (progress: ITransferProgress, info: IParallelTransferInfo) => void): this;
  on(event: 'finish', listener: (info: IParallelTransferInfo) => void): this;
  on(event: 'abort', listener: (id: string) => void): this;
}

export class TransferClient extends EventEmitter {
  protected _clients: Client[] = [];

  protected _tasks: TaskManager;

  constructor(public threads = 1) {
    super();
    this._tasks = new TaskManager(threads);
  }

  public async connect(config: IConfig) {
    let promises: Promise<void>[] = [];

    for (let i = 0; i < this.threads; i++) {
      this._clients[i] = new Client();

      promises.push(this._clients[i].connect(config));
    }

    await Promise.all(promises);
  }

  public async download(remotePath: string, localPath: string): Promise<ITransferStatus> {
    const info: IParallelTransferInfo = {
      id: makeId(32),
      type: 'download',
      status: 'pending',
      localPath,
      remotePath,
    }

    this.emit('new', info);

    return this._tasks.handle(async (taskId, taskIndex) => {
      const client = this._clients[taskIndex];

      await ensureExists(localPath);

      const onProgress = (progress: ITransferProgress) => {
        this.emit('progress', progress, { ...info, status: 'transfering' } as IParallelTransferInfo);
      }

      const onAbort = (id: string) => {
        if (id === info.id) {
          client.abort();
        }
      }

      client.addListener('progress', onProgress);
      this.addListener('abort', onAbort);

      const status = await client.download(remotePath, createWriteStream(localPath, 'utf8'));

      client.removeListener('progress', onProgress);
      this.removeListener('abort', onAbort);

      this.emit('finish', { ...info, status } as IParallelTransferInfo);

      return status;
    });
  }

  public async abort(id: string) {
    this.emit('abort', id);
  }
}

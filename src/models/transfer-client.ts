import { EventEmitter } from 'events';
import { createWriteStream } from 'fs';

import { IConfig, IParallelTransferInfo, ITransferProgress, ITransferStatus, IFile } from '../interfaces';
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

  constructor(public maxClients = 1, public reserveClient = false) {
    super();
    this._tasks = new TaskManager(this._transferClients);
  }

  private get _transferClients(): number {
    return this.reserveClient ? Math.max(1, this.maxClients - 1) : this.maxClients;
  }

  private get _reservedClient(): Client {
    return this.reserveClient ? this._clients[this._clients.length - 1] : null;
  }

  public async connect(config: IConfig) {
    let promises: Promise<void>[] = [];

    for (let i = 0; i < this.maxClients; i++) {
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

    return this._tasks.handle((taskId, taskIndex) => {
      return new Promise(async resolve => {
        const client = this._clients[taskIndex];

        await ensureExists(localPath);

        const onProgress = (progress: ITransferProgress) => {
          this.emit('progress', progress, { ...info, status: 'transfering' } as IParallelTransferInfo);
        }

        const onAbort = async (id: string) => {
          if (id === info.id) {
            await client.abort();
            resolve('aborted');
          }
        }

        client.addListener('progress', onProgress);
        this.addListener('abort', onAbort);

        const status = await client.download(remotePath, createWriteStream(localPath, 'utf8'));

        client.removeListener('progress', onProgress);
        this.removeListener('abort', onAbort);

        if (status !== 'aborted') {
          this.emit('finish', { ...info, status } as IParallelTransferInfo);
          resolve(status);
        }
      });
    });
  }

  public async abort(id: string) {
    this.emit('abort', id);
  }

  private async _callClientMethod(methodName: string, ...args: any[]) {
    if (this._reservedClient) {
      return await this._reservedClient[methodName](...args);
    }

    return await this._tasks.handle(async (taskId, taskIndex) => {
      return await this._clients[taskIndex][methodName](...args);
    });
  }
  
  public readDir = async (path?: string): Promise<IFile[]> => await this._callClientMethod('readDir', path);

  public unlink = async (path: string): Promise<void> => await this._callClientMethod('unlink', path);
}

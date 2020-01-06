import { EventEmitter } from 'events';
import { createWriteStream, createReadStream } from 'fs';

import { IConfig, IParallelTransferInfo, ITransferProgress, ITransferStatus, IFile, IStats, ITransferType } from '../interfaces';
import { Client, IClientBaseMethods } from './client';
import { TaskManager } from './task-manager';
import { makeId, ensureExists } from '../utils';

interface ITransferClientMethods extends IClientBaseMethods {
  /**Connects every client to the server.*/
  connect(config: IConfig): Promise<void>;
  /**Disconnects every client from the server.*/
  disconnect(): Promise<void>;
  /**Aborts every file transfer.*/
  abort(): Promise<void>;
  /**Aborts single file transfer with specified id.*/
  abortSingle(transferId: string): Promise<void>;
  /**Downloads a remote file.*/
  download(remotePath: string, localPath: string): Promise<ITransferStatus>;
  /**Uploads a local file.*/
  upload(localPath: string, remotePath: string): Promise<ITransferStatus>;
}

export declare interface TransferClient {
  on(event: 'new', listener: (info: IParallelTransferInfo) => void): this;
  on(event: 'progress', listener: (progress: ITransferProgress, info: IParallelTransferInfo) => void): this;
  on(event: 'finish', listener: (info: IParallelTransferInfo) => void): this;
  on(event: 'abort', listener: (id: string) => void): this;
  on(event: 'aborted', listener: (id?: string) => void): this;
  once(event: 'aborted', listener: (id?: string) => void): this;
}

export class TransferClient extends EventEmitter implements ITransferClientMethods {
  protected _clients: Client[] = [];

  protected _tasks: TaskManager;

  constructor(public maxClients = 1, public reserveClient = false) {
    super();
    this._tasks = new TaskManager(this._transferClients);
  }

  protected get _transferClients(): number {
    return this.reserveClient ? Math.max(1, this.maxClients - 1) : this.maxClients;
  }

  protected get _reservedClient(): Client {
    return this.reserveClient && this._transferClients > 1 ? this._clients[this._clients.length - 1] : null;
  }

  protected _callClientMethod(methodName: Extract<keyof Client, string>, ...args: any[]) {
    if (this._reservedClient) {
      return this._reservedClient[methodName as any](...args);
    }

    return this._tasks.handle((taskId, taskIndex) => {
      return this._clients[taskIndex][methodName as any](...args);
    });
  }

  protected _handleParallelTransfer(type: ITransferType, localPath: string, remotePath: string): Promise<ITransferStatus> {
    const info: IParallelTransferInfo = {
      id: makeId(32),
      type,
      status: 'pending',
      localPath,
      remotePath,
    }

    this.emit('new', info);

    return this._tasks.handle((taskId, taskIndex) => {
      return new Promise(async resolve => {
        const client = this._clients[taskIndex];
        let status: ITransferStatus;

        await ensureExists(localPath);

        const onProgress = (progress: ITransferProgress) => {
          this.emit('progress', progress, { ...info, status: 'transfering' } as IParallelTransferInfo);
        }

        const onAbort = async (id: string) => {
          if (id === info.id) {
            await client.abort();
            this.emit('aborted', info.id);
            resolve('aborted');
          }
        }

        client.addListener('progress', onProgress);
        this.addListener('abort', onAbort);

        if (type === 'download') {
          status = await client.download(remotePath, createWriteStream(localPath, 'utf8'));
        } else if (type === 'upload') {
          status = await client.upload(remotePath, createReadStream(localPath, 'utf8'));
        }

        client.removeListener('progress', onProgress);
        this.removeListener('abort', onAbort);

        if (status !== 'aborted') {
          this.emit('finish', { ...info, status } as IParallelTransferInfo);
          resolve(status);
        }
      });
    });
  }

  public async connect(config: IConfig) {
    let promises: Promise<void>[] = [];

    for (let i = 0; i < this.maxClients; i++) {
      this._clients[i] = new Client();

      promises.push(this._clients[i].connect(config));
    }

    await Promise.all(promises);
  }

  public async disconnect() {
    await Promise.all(this._clients.map(r => r.disconnect()));
  }

  public async abort() {
    await Promise.all(this._clients.map(r => r.abort()));
  }

  public async abortSingle(transferId: string) {
    return new Promise<void>(resolve => {
      this.once('aborted', id => {
        if (transferId === id) {
          resolve();
        }
      });

      this.emit('abort', transferId);
    });
  }

  public download = (remotePath: string, localPath: string) => this._handleParallelTransfer('download', localPath, remotePath);

  public upload = (localPath: string, remotePath: string) => this._handleParallelTransfer('upload', localPath, remotePath);

  public readDir = (path?: string): Promise<IFile[]> => this._callClientMethod('readDir', path);

  public size = (path: string): Promise<number> => this._callClientMethod('size', path);

  public move = (srcPath: string, destPath: string): Promise<void> => this._callClientMethod('move', srcPath, destPath);

  public stat = (path: string): Promise<IStats> => this._callClientMethod('stat', path);

  public unlink = (path: string): Promise<void> => this._callClientMethod('unlink', path);

  public rimraf = (path: string): Promise<void> => this._callClientMethod('rimraf', path);

  public delete = (path: string): Promise<void> => this._callClientMethod('delete', path);

  public mkdir = (path: string): Promise<void> => this._callClientMethod('mkdir', path);

  public pwd = (): Promise<string> => this._callClientMethod('pwd');

  public exists = (path: string): Promise<boolean> => this._callClientMethod('exists', path);

  public send = (command: string): Promise<string> => this._callClientMethod('send', command);

  public touch = (path: string): Promise<void> => this._callClientMethod('touch', path);

  public createBlank = (type: 'folder' | 'file', path?: string, files?: IFile[]): Promise<string> => this._callClientMethod('createBlank', type, path, files);
}

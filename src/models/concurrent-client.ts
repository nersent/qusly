import { EventEmitter } from 'events';
import { createWriteStream, createReadStream } from 'fs';

import {
  IConfig,
  IConcurrentTransferInfo,
  ITransferProgress,
  ITransferStatus,
  IFile,
  IStats,
  ITransferType,
  IOptions,
} from '../interfaces';
import { Client, IClientBaseMethods, IClientEvents } from './client';
import { TaskManager } from './task-manager';
import { makeId, ensureExists } from '../utils';

interface IConcurrentClientMethods extends IClientBaseMethods {
  /**Connects every client to the server.*/
  connect(config: IConfig): Promise<void>;
  /**Disconnects every client from the server.*/
  disconnect(): Promise<void>;
  /**Aborts a file transfer with specified id.*/
  abort(transferId: string): Promise<void>;
  /**Aborts every file transfer.*/
  abortAll(): Promise<void>;
  /**Downloads a remote file.*/
  download(remotePath: string, localPath: string): Promise<ITransferStatus>;
  /**Uploads a local file.*/
  upload(localPath: string, remotePath: string): Promise<ITransferStatus>;
}

export type IConcurrentClientEvents =
  | 'abort-all'
  | 'new'
  | 'finished'
  | IClientEvents;

export declare interface ConcurrentClient {
  /**Emitted when every client has connected with a server.*/
  on(event: 'connected', listener: Function): this;
  /**Emitted when every client has disconnected from a server.*/
  on(event: 'disconnected', listener: Function): this;
  /**Emitted when `ConcurrentClient.abort` is called.*/
  on(event: 'abort', listener: (id: string) => void): this;
  /**Emitted when `ConcurrentClient.abortAll` is called.*/
  on(event: 'abort-all', listener: Function): this;
  /**Emitted when a new file transfer is requested.*/
  on(event: 'new', listener: (info: IConcurrentTransferInfo) => void): this;
  /**Emitted when a chunk of a file was read and sent.*/
  on(
    event: 'progress',
    listener: (
      progress: ITransferProgress,
      info: IConcurrentTransferInfo,
    ) => void,
  ): this;
  /**Emitted when a file transfer has finished or has been aborted.*/
  on(
    event: 'finished',
    listener: (info: IConcurrentTransferInfo) => void,
  ): this;

  once(event: 'connected', listener: Function): this;
  once(event: 'disconnected', listener: Function): this;
  once(event: 'abort', listener: (id: string) => void): this;
  once(event: 'abort-all', listener: Function): this;
  once(event: 'new', listener: (info: IConcurrentTransferInfo) => void): this;
  once(
    event: 'progress',
    listener: (
      progress: ITransferProgress,
      info: IConcurrentTransferInfo,
    ) => void,
  ): this;
  once(
    event: 'finished',
    listener: (info: IConcurrentTransferInfo) => void,
  ): this;

  addListener(event: IConcurrentClientEvents, listener: Function): this;
  removeListener(event: IConcurrentClientEvents, listener: Function): this;
  emit(event: IConcurrentClientEvents, ...args: any[]): boolean;
}

/**API to transfer files using queue, which you can speed up by setting the number of clients in the constructor. You can also use the same methods like in the `Client` class in concurrent to transfer, if you set `reserveClient` to true. */
export class ConcurrentClient extends EventEmitter
  implements IConcurrentClientMethods {
  protected _clients: Client[] = [];

  protected _tasks: TaskManager;

  protected _activeTransfers: Map<string, Client> = new Map();

  /**
   * @param maxClients - How many clients  you want to allocate for file transfer.
   * @param reserveClient - Allocate one client for general methods like `readDir`. This will substract one from `maxClients`, if its greater than 1.
   */
  constructor(public maxClients = 1, public reserveClient = false) {
    super();
    this._tasks = new TaskManager(this._transferClients);
  }

  protected get _transferClients(): number {
    return this.reserveClient
      ? Math.max(1, this.maxClients - 1)
      : this.maxClients;
  }

  protected get _reservedClient(): Client {
    return this.reserveClient && this._transferClients > 1
      ? this._clients[this._clients.length - 1]
      : null;
  }

  protected _callClientMethod(
    methodName: Extract<keyof Client, string>,
    ...args: any[]
  ) {
    if (this._reservedClient) {
      return this._reservedClient[methodName as any](...args);
    }

    return this._tasks.handle((_, taskIndex) => {
      return this._clients[taskIndex][methodName as any](...args);
    });
  }

  protected async _abortActiveTransfers() {
    const promises: Promise<void>[] = [];

    this._activeTransfers.forEach(r => {
      promises.push(r.abort());
    });

    await Promise.all(promises);
  }

  protected async _handleConcurrentTransfer(
    type: ITransferType,
    localPath: string,
    remotePath: string,
  ) {
    const info: IConcurrentTransferInfo = {
      id: makeId(32),
      type,
      status: 'pending',
      localPath,
      remotePath,
    };

    this.emit('new', info);

    const status = await this._tasks.handle<ITransferStatus>(
      (_, taskIndex) => {
        return new Promise<ITransferStatus>(async resolve => {
          let status: ITransferStatus;

          const client = this._clients[taskIndex];

          this._activeTransfers.set(info.id, client);

          await ensureExists(localPath);

          const onProgress = (progress: ITransferProgress) => {
            if (status !== 'aborted') {
              this.emit('progress', progress, {
                ...info,
                status: 'transfering',
              } as IConcurrentTransferInfo);
            }
          };

          const onAbort = () => {
            status = 'aborted';

            client.once('connected', () => {
              resolve('aborted');
            });
          };

          client.addListener('progress', onProgress);
          client.once('abort', onAbort);

          if (type === 'download') {
            status = await client.download(
              remotePath,
              createWriteStream(localPath, 'utf8'),
            );
          } else if (type === 'upload') {
            status = await client.upload(
              remotePath,
              createReadStream(localPath, 'utf8'),
            );
          }

          client.removeListener('progress', onProgress);
          this._activeTransfers.delete(info.id);

          this.emit('finished', { ...info, status } as IConcurrentTransferInfo);

          if (status !== 'aborted') {
            client.removeListener('abort', onAbort);
            resolve(status);
          }
        });
      },
      info.id,
      'transfer',
    );

    return status || 'aborted';
  }

  public async connect(config: IConfig, options?: IOptions) {
    let promises: Promise<void>[] = [];

    for (let i = 0; i < this.maxClients; i++) {
      this._clients[i] = new Client();

      promises.push(this._clients[i].connect(config, options));
    }

    await Promise.all(promises);

    this.emit('connected');
  }

  public async disconnect() {
    await Promise.all(this._clients.map(r => r.disconnect()));

    this.emit('disconnected');
  }

  public async abortAll() {
    this.emit('abort-all');

    this._tasks.deleteAll(r => r.data === 'transfer');

    await this._abortActiveTransfers();
  }

  public async abort(transferId: string) {
    this.emit('abort');

    const client = this._activeTransfers.get(transferId);

    await client.abort();
  }

  public download = (remotePath: string, localPath: string) =>
    this._handleConcurrentTransfer('download', localPath, remotePath);

  public upload = (localPath: string, remotePath: string) =>
    this._handleConcurrentTransfer('upload', localPath, remotePath);

  public readDir = (path?: string): Promise<IFile[]> =>
    this._callClientMethod('readDir', path);

  public size = (path: string): Promise<number> =>
    this._callClientMethod('size', path);

  public move = (srcPath: string, destPath: string): Promise<void> =>
    this._callClientMethod('move', srcPath, destPath);

  public stat = (path: string): Promise<IStats> =>
    this._callClientMethod('stat', path);

  public unlink = (path: string): Promise<void> =>
    this._callClientMethod('unlink', path);

  public rimraf = (path: string): Promise<void> =>
    this._callClientMethod('rimraf', path);

  public delete = (path: string): Promise<void> =>
    this._callClientMethod('delete', path);

  public mkdir = (path: string): Promise<void> =>
    this._callClientMethod('mkdir', path);

  public pwd = (): Promise<string> => this._callClientMethod('pwd');

  public exists = (path: string): Promise<boolean> =>
    this._callClientMethod('exists', path);

  public send = (command: string): Promise<string> =>
    this._callClientMethod('send', command);

  public touch = (path: string): Promise<void> =>
    this._callClientMethod('touch', path);

  public createBlank = (
    type: 'folder' | 'file',
    path?: string,
    files?: IFile[],
  ): Promise<string> =>
    this._callClientMethod('createBlank', type, path, files);
}

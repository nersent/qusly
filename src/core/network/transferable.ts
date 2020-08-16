import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';

import { TaskManager } from '~/common/tasks/task-manager';
import { TaskGroup } from '../constants/task-group';
import { useWriteStream, useReadStream } from '../utils/stream';
import { getFileSize, fileExists } from '../utils/file';
import { IClientTransferHandler, ITransferableUpdater } from '../interfaces';
import { ITransferProgress, ITransferListener } from '~/common/interfaces';
import { Strategy } from '~/common/strategies/strategy';
import { NetworkUtils } from '~/common/network/network-utils';

export class Transferable extends EventEmitter {
  private _bytes = 0;

  private _totalBytes = 0;

  private active = false;

  private startTime: number;

  public get bytes() {
    return this._bytes;
  }

  public get totalBytes() {
    return this._totalBytes;
  }

  public set totalBytes(value: number) {
    if (this.active) {
      throw new Error(`You can\'t set total bytes while transfering`);
    }

    this.totalBytes = value;
  }

  public get info(): ITransferProgress {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const speed = NetworkUtils.getSpeed(elapsed, this._bytes);
    const eta = NetworkUtils.getEta(elapsed, speed, this._totalBytes);
    const percent = NetworkUtils.getPercent(this._bytes, this._totalBytes);

    return {
      bytes: this._bytes,
      totalBytes: this._totalBytes,
      eta,
      percent,
      speed,
    };
  }

  constructor(
    public readonly remotePath: string,
    protected taskManager: TaskManager,
  ) {
    super();
  }

  private update: ITransferListener = (bytes) => {
    this._bytes = bytes;

    console.log('update');
  };

  private check() {
    if (this.active) {
      throw new Error(
        `You can\'t reuse the same transferable instance when it's doing work`,
      );
    }
  }

  public async download(dest: string | Writable, startAt?: number) {
    this.check();

    const { stream, localPath } = useWriteStream(dest, startAt);

    this._bytes = startAt ?? 0;

    await this.handle(
      async (instance) =>
        instance.download(stream, {
          localPath,
          remotePath: this.remotePath,
          totalBytes: await instance.size(this.remotePath),
          startAt,
        }),
      localPath,
    );
  }

  public async upload(source: string | Readable) {
    this.check();

    const { stream, localPath } = useReadStream(source);

    await this.handle(async (instance) => {
      let totalBytes = this._totalBytes;

      if (totalBytes != null) {
        totalBytes = await getFileSize(localPath);
      }

      await instance.upload(stream, {
        localPath,
        remotePath: this.remotePath,
        totalBytes,
      });
    }, localPath);
  }

  private async handle(fn: IClientTransferHandler, localPath: string) {
    try {
      await this.taskManager.enqueue(
        async (instance: Strategy) => {
          this.active = true;
          instance.transferListener = this.update;

          if (localPath) {
            const exists = await fileExists(localPath);

            if (!exists) {
              throw new Error(`Local file at ${localPath} doesn\'t exists`);
            }
          }

          this.startTime = Date.now();

          await fn(instance);
        },
        { group: TaskGroup.Transfer },
      );
    } catch (err) {
      throw err;
    } finally {
      this.emit('finish');
      this.active = false;
    }
  }
}

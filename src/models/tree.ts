import { EventEmitter } from 'events';

import { IConfig, ITreeItem, ITreeOptions } from '../interfaces';
import { formatPath } from '../utils';
import { Client } from './client';

export declare interface Tree {
  on(event: 'fetch', listener: (item: ITreeItem) => void): this;
  on(event: 'finish', listener: Function): this;
  once(event: 'finish', listener: Function): this;
}

export class Tree extends EventEmitter {
  private client = new Client();

  private connected = false;

  private queue: string[] = [];

  private tempQueue: string[] = [];

  private depth = -1;

  public async connect(config: IConfig) {
    const res = await this.client.connect(config);
    this.connected = res.success;
    return res;
  }

  public async init(options: ITreeOptions = {}) {
    this.depth = -1;
    this.queue = [options.path || '/'];

    await this.traverse(options);
    await this.client.disconnect();

    this.emit('finish');
    this.connected = false;
    this.queue = [];
  }

  private async traverse(options: ITreeOptions) {
    const { filter, maxDepth } = options;

    if (this.depth > maxDepth || !this.connected) return;

    for (const path of this.queue) {
      const res = await this.client.readDir(path);

      if (!res.success) {
        console.error(`Can't traverse to ${path}: `, res.error);
        continue;
      }

      for (const file of res.files) {
        const filePath = formatPath(path, file);
        const item: ITreeItem = {
          path: filePath,
          file,
        };

        if (!filter || filter(item)) {
          this.emit('fetch', item)

          if (file.type === 'directory') {
            this.tempQueue.push(filePath);
          }
        }
      }
    }

    this.queue = this.tempQueue;
    this.tempQueue = [];
    this.depth++;

    await this.traverse(options);
  }
}

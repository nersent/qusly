import { EventEmitter } from 'events';

import { IConfig, ITreeItem } from '../interfaces';
import { formatPath } from '../utils';
import { Client } from './client';

export declare interface Tree {
  on(event: 'fetch', listener: (item: ITreeItem) => void): this;
  on(event: 'finish', listener: Function): this;
  once(event: 'finish', listener: Function): this;
}

export class Tree extends EventEmitter {
  public client = new Client();

  public connected = false;

  private queue: string[] = ['/'];

  private tempQueue: string[] = [];

  private depth = -1;

  public async connect(config: IConfig) {
    const res = await this.client.connect(config);
    this.connected = res.success;
    return res;
  }

  public async init(maxDepth = 0) {
    await this.traverse(maxDepth);
    this.emit('finish');
  }

  private async traverse(maxDepth: number) {
    if (this.depth > maxDepth || !this.connected) return;

    for (const path of this.queue) {
      const res = await this.client.readDir(path);

      if (!res.success) {
        console.error(`Can't traverse ${path}: `, res.error);
        continue;
      }

      for (const file of res.files) {
        const filePath = formatPath(path, file);

        if (file.type === 'directory') {
          this.tempQueue.push(filePath);
        }

        this.emit('fetch', {
          path: filePath,
          file,
        })
      }
    }

    this.queue = this.tempQueue;
    this.tempQueue = [];
    this.depth++;

    await this.traverse(maxDepth);
  }
}

import { EventEmitter } from 'events';

import { IConfig } from '../interfaces';
import { formatPath } from '../utils';
import { Client } from './client';

export class Tree extends EventEmitter {
  private client = new Client();

  private connected = false;

  private queue: string[] = ['/'];

  private tempQueue: string[] = [];

  private depth = -1;

  public async connect(config: IConfig) {
    const res = await this.client.connect(config);
    this.connected = res.success;
    return res;
  }

  public init(maxDepth = 0) {
    this.traverse(maxDepth);
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

        console.log(filePath, ':', file.name);

        if (file.type === 'directory') {
          this.tempQueue.push(filePath);
        }
      }
    }

    this.queue = this.tempQueue;
    this.tempQueue = [];
    this.depth++;

    await this.traverse(maxDepth);
  }
}

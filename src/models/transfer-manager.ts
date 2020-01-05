import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';

import { ITransferStatus, ITransferType, ITransferOptions, IProgressEvent } from '../interfaces';
import { Client } from './client';
import { calcElapsed, calcEta, getFilePath, getFileSize } from '../utils';

interface ITransferInfo {
  type?: ITransferType;
  localPath?: string;
  remotePath?: string;
  size?: number;
  options?: ITransferOptions;
  stream?: Writable | Readable;
}

export declare interface TransferManager {
  on(event: 'progress', listener: (buffered: number) => void): this;
}

export class TransferManager extends EventEmitter {
  protected _buffered = 0;

  protected _status: ITransferStatus;

  protected _info: ITransferInfo;

  protected _startAt: Date;

  constructor(protected _client: Client) {
    super();
  }

  public async download(remotePath: string, dest: Writable, options: ITransferOptions = {}) {
    const localPath = getFilePath(dest);
    const size = await this._getFileSize(remotePath);

    return this._handle({ type: 'download', remotePath, localPath, size, options, stream: dest });
  }

  public async upload(remotePath: string, source: Readable, options: ITransferOptions = {}) {
    const localPath = getFilePath(source);
    const size = await getFileSize(source);

    return this._handle({ type: 'upload', remotePath, localPath, size, options, stream: source });
  }

  protected async _handle(info: ITransferInfo) {
    const { type, remotePath, options, stream } = info;

    this._info = info;
    this._prepare();

    try {
      switch (type) {
        case 'download': {
          if (this._client.isSftp) {
            await this._client._sftpClient.download(remotePath, stream as Writable, options.startAt);
          } else {
            await this._client._ftpClient.downloadTo(stream as Writable, remotePath, options.startAt);
          }

          break;
        }
        case 'upload': {
          if (this._client.isSftp) {
            await this._client._sftpClient.upload(remotePath, stream as Readable);
          } else {
            await this._client._ftpClient.uploadFrom(stream as Readable, remotePath);
          }

          break;
        }
      }

      if (!this._status) {
        this._status = 'finished';
      }
    } catch (err) {
      if (err.message !== 'User closed client during task') {
        this._status = 'closed';

        throw err;
      }
    }

    this._clean();

    return this._status;
  }

  protected _prepare() {
    this._buffered = 0;
    this._status = null;
    this._startAt = new Date();
    this._client.once('disconnect', this._onDisconnect);

    if (this._client.isSftp) {
      this._client._sftpClient.addListener('progress', this._onSftpProgress);
    } else {
      this._client._ftpClient.trackProgress(info => {
        this._buffered = info.bytes;
        this._onProgress()
      });
    }
  }

  protected _clean() {
    if (this._client.isSftp) {
      this._client._sftpClient.removeListener('progress', this._onSftpProgress);
    } else {
      this._client._ftpClient.trackProgress(undefined);
    }

    this._client.removeListener('disconnect', this._onDisconnect);
  }

  protected _onDisconnect = () => {
    this._status = 'aborted';

    const { stream } = this._info;

    if (!this._client.isSftp) {
      stream.destroy();
    }
  }

  protected _onSftpProgress = (chunk: any) => {
    this._buffered += chunk.length;
    this._onProgress();
  }

  protected _onProgress() {
    const { type, remotePath, localPath, size, options } = this._info;

    if (!options.quiet) {
      const elapsed = calcElapsed(this._startAt.getTime());
      const speed = this._buffered / elapsed; // bytes per second
      const eta = calcEta(elapsed, this._buffered, size); // seconds
      const percent = Math.round(this._buffered / size * 100);

      const event: IProgressEvent = {
        context: this._client,
        buffered: this._buffered,
        startAt: this._startAt,
        speed,
        eta,
        percent,
        size,
        remotePath,
        type,
        localPath,
      }

      this._client.emit('progress', event);
    }
  }

  protected async _getFileSize(path: string, options?: ITransferOptions) {
    let size = await (this._client.isSftp ? this._client._sftpClient.size(path) : this._client._ftpClient.size(path));

    if (options && options.startAt) {
      size -= options.startAt;
    }

    return size;
  }
}

import { Writable, Readable } from 'stream';

import { ITransferStatus, ITransferOptions, ITransferProgress, ITransferInfo } from '../interfaces';
import { Client } from './client';
import { calcElapsed, calcEta, getFilePath, getFileSize } from '../utils';

interface ITransferData {
  info?: Partial<ITransferInfo>;
  size?: number;
  options?: ITransferOptions;
  stream?: Writable | Readable;
}

export class TransferManager {
  public buffered = 0;

  protected _status: ITransferStatus;

  protected _data: ITransferData;

  constructor(protected _client: Client) { }

  public async download(remotePath: string, dest: Writable, options: ITransferOptions = {}) {
    const localPath = getFilePath(dest);
    const size = await this._getFileSize(remotePath);

    return this._handleTransfer({
      info: {
        type: 'download',
        remotePath,
        localPath,
      },
      stream: dest,
      options,
      size,
    });
  }

  public async upload(remotePath: string, source: Readable, options: ITransferOptions = {}) {
    const localPath = getFilePath(source);
    const size = await getFileSize(source);

    return this._handleTransfer({
      info: {
        type: 'upload',
        remotePath,
        localPath,
      },
      stream: source,
      options,
      size,
    });
  }

  protected async _handleTransfer(data: ITransferData) {
    const { info, options, stream } = data;
    const { type, remotePath } = info;

    this._data = data;
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
    this.buffered = 0;
    this._status = null;
    this._data.info = { ...this._data.info, startAt: new Date(), context: this._client };
    this._client.once('disconnect', this._onDisconnect);

    if (this._client.isSftp) {
      this._client._sftpClient.addListener('progress', this._onSftpProgress);
    } else {
      this._client._ftpClient.trackProgress(info => {
        this.buffered = info.bytes;
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
    this._data = undefined;
  }

  protected _onDisconnect = () => {
    this._status = 'aborted';

    const { stream } = this._data;

    if (!this._client.isSftp) {
      stream.destroy();
    }
  }

  protected _onSftpProgress = (chunk: any) => {
    this.buffered += chunk.length;
    this._onProgress();
  }

  protected _onProgress() {
    const { info, options, size } = this._data;
    const { startAt } = info;

    if (!options.quiet) {
      const elapsed = calcElapsed(startAt.getTime());
      const speed = this.buffered / elapsed; // bytes per second
      const eta = calcEta(elapsed, this.buffered, size); // seconds
      const percent = Math.round(this.buffered / size * 100);

      const progress: ITransferProgress = {
        buffered: this.buffered,
        speed,
        percent,
        eta,
        size,
      }

      this._client.emit('progress', progress, info);
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

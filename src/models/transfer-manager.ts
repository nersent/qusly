import { Readable, Writable } from 'stream';

import { Client } from './client';
import { IDownloadOptions, ITransferOptions, IProgress } from '../interfaces';
import { calcElapsed, calcEta, getFilePath, getFileSize } from '../utils';

interface ITransferData {
  type?: 'download' | 'upload';
  size?: number;
  localPath?: string;
  remotePath?: string;
  options?: IDownloadOptions;
}

export class TransferManager {
  protected _readable: Readable;

  protected _writable: Writable;

  public _buffered = 0;

  protected _aborting = false;

  protected _startAt: number;

  constructor(protected _client: Client) { }

  public async download(remotePath: string, dest: Writable, options?: IDownloadOptions) {
    const localPath = getFilePath(dest);
    const size = this._client.isSftp ? await this._client._sftpClient.size(remotePath) : await this._client._ftpClient.size(remotePath);

    options = { startAt: 0, ...options };

    if (this._client.isSftp) {
      this._readable = this._client._sftpClient.createReadStream(remotePath, options.startAt);
    }

    this._buffered = 0;
    this._writable = dest;

    return this._handleStream({
      type: 'download',
      size: size - options.startAt,
      remotePath,
      localPath,
      options
    });
  }

  public async upload(remotePath: string, source: Readable, options?: ITransferOptions) {
    const localPath = getFilePath(source);
    const size = await getFileSize(source);

    if (this._client.isSftp) {
      this._writable = this._client._sftpClient.createWriteStream(remotePath);
    }

    this._readable = source;
    this._buffered = 0;

    return this._handleStream({
      type: 'upload',
      size,
      remotePath,
      localPath,
      options
    });
  }

  protected async _handleStream(data: ITransferData) {
    this._startAt = new Date().getTime();

    if (this._client.isSftp) {
      await this._handleSftp(data);
    } else {
      await this._handleFtp(data);
    }

    this.closeStreams();
  }

  protected _handleSftp(data: ITransferData) {
    return new Promise((resolve, reject) => {
      this._buffered = 0;

      this._readable.on('data', (chunk) => {
        if (this._aborting) return;

        this._buffered += chunk.length;
        this._emitProgress(chunk.length, data);
      });

      const onError = (err) => reject(err);
      const onClose = () => resolve();

      if (data.type === 'download') {
        this._readable.once('error', onError);
        this._readable.once('close', onClose);
      } else {
        this._writable.once('error', onError);
        this._writable.once('finish', onClose);
      }

      this._readable.pipe(this._writable);
    });
  }

  protected async _handleFtp(data: ITransferData) {
    const { type, remotePath, options } = data;

    this._client._ftpClient.trackProgress(info => {
      if (this._aborting) return;

      this._buffered = info.bytes;
      this._emitProgress(info.bytes, data);
    });

    if (type === 'download') {
      await this._client._ftpClient.download(this._writable, remotePath, options.startAt);
    } else {
      await this._client._ftpClient.upload(this._readable, remotePath);
    }
  }

  protected _emitProgress(chunkSize: number, transferData: ITransferData) {
    const { options, remotePath, localPath, size } = transferData;

    if (!options.quiet) {
      const elapsed = calcElapsed(this._startAt);
      const speed = this._buffered / elapsed; // bytes per second
      const eta = calcEta(elapsed, this._buffered, size); // second

      const data: IProgress = {
        buffered: this._buffered,
        startAt: new Date(this._startAt),
        context: this._client,
        chunkSize,
        remotePath,
        localPath,
        size,
        eta,
        speed,
      }

      this._client.emit('progress', data);
    }
  }

  public closeStreams() {
    if (this._readable) {
      this._readable.removeAllListeners();
      this._readable.unpipe(this._writable);

      if (this._writable) {
        this._writable.removeAllListeners();

        this._readable.once('close', () => {
          this._writable.end();
          this._writable = null;
          this._readable = null;
        });

        this._readable.destroy();
      }
    } else if (this._writable) {
      this._writable.end();
    }

    if (!this._client.isSftp) {
      this._client._ftpClient.trackProgress(undefined);

      if (this._client._ftpClient.ftp.dataSocket) {
        this._client._ftpClient.ftp.dataSocket.unpipe(this._writable);
      }
    }

    this._startAt = null;
  }
}

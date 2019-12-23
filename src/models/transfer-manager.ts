import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';

import { Client } from './client';
import { IDownloadOptions, ITransferOptions, IProgress, ITransferType } from '../interfaces';
import { calcElapsed, calcEta, getFilePath, getFileSize } from '../utils';
import { Socket } from 'net';

interface ITransferData {
  type?: ITransferType;
  size?: number;
  localPath?: string;
  remotePath?: string;
  options?: IDownloadOptions;
}

export declare interface TransferManager {
  on(event: 'abort', listener: Function): this;
  once(event: 'abort', listener: Function): this;
}

export class TransferManager extends EventEmitter {
  protected _readable: Readable;

  protected _writable: Writable;

  public _buffered = 0;

  protected _size = 0;

  protected _aborting = false;

  protected _startAt: number;

  constructor(protected _client: Client) {
    super();
  }

  public async download(remotePath: string, dest: Writable, options: IDownloadOptions, resume?: boolean) {
    const localPath = getFilePath(dest);

    options = { startAt: 0, ...options };

    let size = this._size;

    if (!resume) {
      size = this._client.isSftp ? await this._client._sftpClient.size(remotePath) : await this._client._ftpClient.size(remotePath);
      size -= options.startAt;

      this._size = size;
    }

    if (this._client.isSftp) {
      this._readable = this._client._sftpClient.createReadStream(remotePath, options.startAt);
    }

    this._buffered = resume ? options.startAt : 0;
    this._writable = dest;

    console.log(this._buffered, size);

    return this._handleStream({
      type: 'download',
      size,
      remotePath,
      localPath,
      options
    });
  }

  public async upload(remotePath: string, source: Readable, options: ITransferOptions = {}) {
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

    this.clean();
  }

  protected async _handleSftp(data: ITransferData) {
    let onAbort: Function;

    await new Promise((resolve, reject) => {
      onAbort = () => {
        resolve();
      };

      this.once('abort', onAbort);

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

    this.removeListener('abort', onAbort as any);
  }

  protected async _handleFtp(data: ITransferData) {
    const { type, remotePath, options } = data;

    this._client._ftpClient.trackProgress(info => {
      if (this._aborting) return;

      this._buffered = info.bytes;

      if (this._buffered > 0) {
        this._emitProgress(info.bytes, data);
      }
    });

    try {
      if (type === 'download') {
        await this._client._ftpClient.download(this._writable, remotePath, options.startAt);
      } else {
        await this._client._ftpClient.upload(this._readable, remotePath);
      }
    } catch (err) {
      const msg = err.message;

      console.log(err);

      if (msg !== 'User closed client during task' && msg !== 'Client is closed') {
        throw err;
      }
    }
  }

  protected _emitProgress(chunkSize: number, transferData: ITransferData) {
    const { options, remotePath, localPath, size } = transferData;

    if (!options.quiet) {
      const elapsed = calcElapsed(this._startAt);
      const speed = this._buffered / elapsed; // bytes per second
      const eta = calcEta(elapsed, this._buffered, size); // second
      const percent = Math.round(this._buffered / size * 100);

      const data: IProgress = {
        buffered: this._buffered,
        startAt: new Date(this._startAt),
        context: this._client,
        percent,
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

  public async clean(abort = false) {
    this._closeStreams();

    if (!this._client.isSftp) {
      this._client._ftpClient.trackProgress(undefined);

      if (this._client._ftpClient.ftp.dataSocket) {
        this._client._ftpClient.ftp.dataSocket.unpipe(this._writable);
      }

      if (abort) {
        await this._closeFtp();
      }
    }

    console.log('done');
  }

  protected _closeStreams() {
    this._startAt = null;

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
  }

  protected async _closeFtp() {
    const ftp = this._client._ftpClient.ftp as any;

    if (ftp._task) {
      ftp._task.resolver.resolve()
    }

    const err = new Error('User closed client');

    ftp._closingError = err;
    ftp._closeSocket(ftp._socket);

    await this._closeSocket(ftp._socket);
    await this._closeSocket(ftp._dataSocket);

    ftp._passToHandler(err);
    ftp._stopTrackingTask();
  }

  protected _closeSocket(socket: Socket) {
    if (!socket) return null;

    return new Promise(resolve => {
      socket.once('close', () => {
        socket.removeAllListeners();
        resolve();
      });

      socket.destroy();
    });
  }
}

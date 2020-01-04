import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';

import { ITransferStatus, ITransferType } from '../interfaces';
import { Client } from './client';

interface ITransferData {
  type?: ITransferType;
  remotePath?: string;
}

type IStream = Writable | Readable;

export declare interface TransferManager {
  on(event: 'progress', listener: (buffered: number) => void): this;
}

export class TransferManager extends EventEmitter {
  protected _buffered = 0;

  constructor(protected _client: Client) {
    super();
  }

  public async download(path: string, dest: Writable): Promise<ITransferStatus> {
    this._buffered = 0;

    return this._handle({ type: 'download', remotePath: path }, dest);
  }

  public async upload(path: string, source: Readable): Promise<ITransferStatus> {
    this._buffered = 0;

    return this._handle({ type: 'upload', remotePath: path }, source);
  }

  protected async _handle(data: ITransferData, stream: IStream): Promise<ITransferStatus> {
    let status: ITransferStatus = 'finished';
    let error: Error;

    const onDisconnect = () => {
      console.log("DISCONETXWR");
      status = 'aborted';
    }

    this._client.once('disconnect', onDisconnect);

    if (this._client.isSftp) {
      error = await this._handleSftp(data, stream);
    } else {
      error = await this._handleFtp(data, stream);
    }

    if (error) {
      console.log(`Error: ${error}`);
      status = 'closed';
    }

    this._client.removeListener('disconnect', onDisconnect);

    return status;
  }

  protected async _handleSftp(data: ITransferData, stream: IStream) {
    const { type, remotePath } = data;
    let error: Error;

    const onProgress = chunk => {
      this._buffered += chunk.length;
      this._onProgress(data);
    }

    this._client._sftpClient.addListener('progress', onProgress);

    try {
      if (type === 'download') {
        await this._client._sftpClient.download(remotePath, stream as Writable);
      } else if (type === 'upload') {
        await this._client._sftpClient.upload(remotePath, stream as Readable);
      }
    } catch (err) {
      error = err;
    }

    this._client._sftpClient.removeListener('progress', onProgress);

    return error;
  }

  protected async _handleFtp(data: ITransferData, stream: IStream) {
    const { type, remotePath } = data;
    let error: Error;

    this._client._ftpClient.trackProgress(info => {
      this._buffered = info.bytes;
      this._onProgress(data)
    });

    try {
      if (type === 'download') {
        await this._client._ftpClient.downloadTo(stream as Writable, remotePath);
      } else if (type === 'upload') {
        await this._client._ftpClient.uploadFrom(stream as Readable, remotePath);
      }
    } catch (err) {
      if (err.message !== 'User closed client during task') {
        error = err;
      }
    }

    this._client._ftpClient.trackProgress(undefined);

    return error;
  }

  protected _onProgress(data: ITransferData) {
    this._client.emit('progress', this._buffered);
  }
}

import { Readable, Writable } from "stream";

import { Client } from "./client";
import { IStreamInfo } from "./stream-info";

export class TransferManager {
  public readable: Readable;

  public writable: Writable;

  public buffered = 0;

  public aborting = false;

  constructor(public client: Client) { }

  public async download(path: string, destination: Writable, startAt = 0) {
    const sizeRes = await this.client.size(path);
    if (!sizeRes.success) return sizeRes;

    if (this.client.protocol === 'sftp') {
      this.readable = this.client._sftpClient.createReadStream(path, startAt);
    }

    this.buffered = 0;
    this.writable = destination;

    return this.handleStream({
      type: 'download',
      size: sizeRes.size - startAt,
      path,
      startAt
    });
  }

  public upload(path: string, source: Readable, size?: number) {
    if (this.client.protocol === 'sftp') {
      this.writable = this.client._sftpClient.createWriteStream(path);
    }

    this.readable = source;
    this.buffered = 0;

    return this.handleStream({
      type: 'upload',
      size,
      path,
    });
  }

  public async handleStream(data: IStreamInfo) {
    try {
      if (this.client.protocol === 'sftp') {
        await this.handleSftpStream(data);
      } else {
        await this.handleFtpStream(data);
      }

      this.closeStreams();
    } catch (err) {
      this.closeStreams();
      return { success: false, error: err };
    }

    return { success: true };
  }

  public handleSftpStream(data: IStreamInfo) {
    return new Promise((resolve, reject) => {
      this.buffered = 0;

      this.readable.on('data', (chunk) => {
        this.buffered += chunk.length;

        this.client.emit('progress', { ...data, bytes: this.buffered });
      });

      const onError = (err) => reject(err);
      const onClose = () => resolve();

      if (data.type === 'download') {
        this.readable.once('error', onError);
        this.readable.once('close', onClose);
      } else {
        this.writable.once('error', onError);
        this.writable.once('finish', onClose);
      }

      this.readable.pipe(this.writable);
    });
  }

  public async handleFtpStream(data: IStreamInfo) {
    this.client._ftpClient.trackProgress(info => {
      if (this.aborting) return;

      this.buffered = info.bytes;
      this.client.emit('progress', { ...data, bytes: this.buffered });
    });

    if (data.type === 'download') {
      await this.client._ftpClient.download(this.writable, data.path, data.startAt);
    } else {
      await this.client._ftpClient.upload(this.readable, data.path);
    }
  }

  public closeStreams() {
    if (this.readable != null) {
      this.readable.removeAllListeners();
      this.readable.unpipe(this.writable);

      if (this.writable != null) {
        this.writable.removeAllListeners();

        this.readable.once('close', () => {
          this.writable.end();
          this.writable = null;
          this.readable = null;
        });

        this.readable.destroy();
      }
    } else if (this.writable != null) {
      this.writable.end();
    }

    if (this.client.protocol === 'ftp') {
      this.client._ftpClient.trackProgress(undefined);

      if (this.client._ftpClient.ftp.dataSocket != null) {
        this.client._ftpClient.ftp.dataSocket.unpipe(this.writable);
      }
    }
  }
}

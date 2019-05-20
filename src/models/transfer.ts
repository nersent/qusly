import { Readable, Writable } from "stream";

import { Client } from "./client";
import { IStreamInfo } from "./stream-info";

export class TransferManager {
  public readable: Readable;

  public writable: Writable;

  public buffered = 0;

  constructor(public client: Client) { }

  public async download(path: string, destination: Writable, startAt = 0) {
    const sizeRes = await this.client.size(path);
    if (!sizeRes.success) return sizeRes;

    if (this.client.protocol === 'sftp') {
      this.buffered = 0;
      this.readable = this.client._sftpClient.createReadStream(path, startAt);
    }

    this.writable = destination;

    return this.handleStream({
      type: 'download',
      size: sizeRes.size - startAt,
      path,
      startAt
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

  public handleSftpStream({ type, size }: IStreamInfo) {
    return new Promise((resolve, reject) => {
      this.buffered = 0;

      this.readable.on('data', (chunk) => {
        this.buffered += chunk.length;

        console.log(this.buffered, size);

        console.log(`${(this.buffered / size * 100).toFixed(2)}%`);
      });

      const onError = (err) => reject(err);
      const onClose = () => resolve();

      if (type === 'download') {
        this.readable.once('error', onError);
        this.readable.once('close', onClose);
      } else {
        this.writable.once('error', onError);
        this.writable.once('finish', onClose);
      }

      this.readable.pipe(this.writable);
    });
  }

  public async handleFtpStream({ type, size, path, startAt }: IStreamInfo) {
    this.client._ftpClient.trackProgress(info => {
      this.buffered = info.bytes;

      console.log(`${(this.buffered / size * 100).toFixed(2)}%`);
    });

    if (type === 'download') {
      await this.client._ftpClient.download(this.writable, path, startAt);
    } else {
      await this.client._ftpClient.upload(this.readable, path);
    }

    this.client._ftpClient.trackProgress(undefined);
  }

  public closeStreams() {

  }
}

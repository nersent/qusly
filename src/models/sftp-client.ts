import { EventEmitter } from 'events';
import { Client as SshClient, SFTPWrapper } from 'ssh2';
import { FileEntry, Stats } from 'ssh2-streams';
import { Writable, Readable } from 'stream';
import { Socket } from 'net';

import { IConfig } from '../interfaces';
import { Client } from '../models';

export declare interface SftpClient {
  on(event: 'progress', listener: (buffered: number) => void): this;
}

export class SftpClient extends EventEmitter {
  public _ssh: SshClient;

  public _wrapper: SFTPWrapper;

  constructor(protected _client: Client) {
    super();
  }

  public get socket(): Socket {
    return (this._ssh as any)._sock;
  }

  public connect(config: IConfig) {
    return new Promise((resolve, reject) => {
      this._ssh = new SshClient();

      this._ssh.once('error', (e) => {
        this._ssh.removeAllListeners();
        reject(e);
      });

      this._ssh.once('ready', () => {
        this._ssh.removeAllListeners();
        this._ssh.sftp((err, sftp) => {
          if (err) return reject(err);

          this._wrapper = sftp;
          resolve();
        });
      });

      this._ssh.connect({ username: config.user, ...config });
    });
  }

  public disconnect() {
    return new Promise(resolve => {
      this.socket.addListener('close', () => {
        this._wrapper = null;
        this._ssh = null;
        resolve();
      });

      this._ssh.end();
    });
  }

  public size(path: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this._wrapper.stat(path, (err, stats) => {
        if (err) return reject(err);
        resolve(stats.size);
      })
    });
  }

  public send(command: string) {
    return new Promise((resolve, reject) => {
      this._ssh.exec(command, (err, stream): any => {
        if (err) return reject(err);
        let data = '';

        stream.once('error', (err: Error) => {
          stream.close();
          reject(err);
        });

        stream.on('data', (chunk) => {
          data += chunk;
        });

        stream.once('close', () => {
          stream.close();
          resolve(data);
        })
      })
    });
  }

  public move(src: string, dest: string) {
    return new Promise((resolve, reject) => {
      this._wrapper.rename(src, dest, (err) => {
        if (err) return reject(err);
        resolve();
      });
    })
  }

  public unlink(path: string) {
    return new Promise((resolve, reject) => {
      this._wrapper.unlink(path, (err) => {
        if (err) return reject(err);
        resolve();
      })
    });
  }

  public async removeDir(path: string) {
    const files = await this.readDir(path);

    if (files.length) {
      for (const file of files) {
        const filePath = path + '/' + file.filename;

        if ((file.attrs as any).isDirectory()) {
          await this.removeDir(filePath);
        } else {
          await this.unlink(filePath);
        }
      }
    }

    await this.removeEmptyDir(path);
  };

  public removeEmptyDir(path: string) {
    return new Promise((resolve, reject) => {
      this._wrapper.rmdir(path, (err) => {
        if (err) return reject(err);
        resolve();
      })
    });
  };

  public mkdir(path: string) {
    return new Promise((resolve, reject) => {
      this._wrapper.mkdir(path, (err) => {
        if (err) return reject(err);
        resolve();
      })
    });
  }

  public pwd() {
    return new Promise((resolve, reject) => {
      this._wrapper.realpath("./", (err, path) => {
        if (err) return reject(err);
        resolve(path);
      });
    });
  }

  public readDir(path: string): Promise<FileEntry[]> {
    return new Promise((resolve, reject) => {
      this._wrapper.readdir(path, (err, files) => {
        if (err) return reject(err);
        resolve(files);
      });
    });
  }

  public createReadStream(path: string, start = 0) {
    return this._wrapper.createReadStream(path, { start, autoClose: true });
  }

  public createWriteStream(path: string) {
    return this._wrapper.createWriteStream(path);
  }

  public stat(path: string): Promise<Stats> {
    return new Promise((resolve, reject) => {
      this._wrapper.stat(path, (err, stats) => {
        if (err) return reject(err);
        resolve(stats);
      });
    });
  }

  public touch(path: string) {
    return new Promise((resolve, reject) => {
      this._wrapper.open(path, 'w', (err, handle) => {
        if (err) return reject(err);

        this._wrapper.close(handle, (err) => {
          if (err) return reject(err);
          resolve();
        })
      })
    });
  }

  public download(path: string, dest: Writable, startAt?: number) {
    return new Promise((resolve, reject) => {
      const source = this.createReadStream(path, startAt);

      this._client.once('disconnect', resolve);

      source.on('data', chunk => {
        this.emit('progress', chunk);
      });

      source.once('error', err => {
        this._client.removeListener('disconnect', resolve);
        reject(err);
      });

      source.once('close', () => {
        this._client.removeListener('disconnect', resolve);
        resolve();
      });

      source.pipe(dest);
    });
  }

  public upload(path: string, source: Readable) {
    return new Promise((resolve, reject) => {
      const dest = this.createWriteStream(path);

      this._client.once('disconnect', resolve);

      source.on('data', chunk => {
        this.emit('progress', chunk);
      });

      dest.once('error', err => {
        this._client.removeListener('disconnect', resolve);
        reject(err);
      });

      dest.once('close', () => {
        this._client.removeListener('disconnect', resolve);
        resolve();
      });

      source.pipe(dest);
    });
  }
}

import { Writable, Readable } from 'stream';
import { promisify } from 'util';
import { Socket } from 'net';
import { Client, SFTPWrapper, ClientChannel } from 'ssh2';
import { Stats, FileEntry } from 'ssh2-streams';
import { FileInfo, parseList } from 'basic-ftp';

import { Strategy } from './strategy';
import {
  IFile,
  ISftpConfig,
  ITransferOptions,
  ITransferRequestInfo,
} from '~/interfaces';
import { FtpUtils } from '~/utils/ftp';
import { getPathFromStream, getFileSize } from '~/utils/file';

export class SftpStrategy extends Strategy {
  protected client: Client;

  protected wrapper: SFTPWrapper;

  public connected = false;

  protected get socket(): Socket {
    return (this.client as any)._sock;
  }

  protected getWrapper(): SFTPWrapper {
    return promisify(this.client.sftp).bind(this.client)();
  }

  connect = (config: ISftpConfig) => {
    return new Promise<void>((resolve, reject) => {
      if (this.connected) {
        return resolve();
      }

      this.client = new Client();

      const clean = () => {
        this.client.removeListener('error', onError);
        this.client.removeListener('ready', onReady);
        this.client.removeListener(
          'keyboard-interactive',
          this.onKeyboardInteractive,
        );
      };

      const onError = (e) => {
        clean();
        reject(e);
      };

      const onReady = async () => {
        clean();

        try {
          this.wrapper = await this.getWrapper();
          this.connected = true;
          this.emit('connect');

          resolve();
        } catch (err) {
          reject(err);
        } finally {
          clean();
        }
      };

      this.client.once('error', onError);
      this.client.once('ready', onReady);
      this.client.on('end', this.onDisconnect);

      if (config?.options?.tryKeyboard) {
        this.client.once('keyboard-interactive', this.onKeyboardInteractive);
      }

      this.client.connect({
        username: config.user,
        ...config,
        readyTimeout: 5000,
      });
    });
  };

  disconnect = () => {
    if (this.connected) {
      return new Promise<void>((resolve) => {
        this.socket.once('close', () => {
          resolve();
        });

        this.client.end();
      });
    }

    return null;
  };

  abort = async () => {
    this.emit('abort');

    await this.disconnect();
    await this.connect(this.config as ISftpConfig);
  };

  download = async (
    dest: Writable,
    remotePath: string,
    options?: ITransferOptions,
  ) => {
    const localPath = getPathFromStream(dest);
    const totalBytes = await this.size(remotePath);

    if (!this.connected) return;

    const source = this.wrapper.createReadStream(remotePath, {
      start: options?.startAt,
      autoClose: true,
    });

    return this.handleTransfer(
      source,
      dest,
      { localPath, remotePath, totalBytes },
      options,
    );
  };

  upload = async (
    source: Readable,
    remotePath: string,
    options?: ITransferOptions,
  ) => {
    const localPath = getPathFromStream(source);
    const totalBytes = await getFileSize(localPath);

    if (!this.connected) return;

    const dest = this.wrapper.createWriteStream(remotePath);

    return this.handleTransfer(
      source,
      dest,
      { localPath, remotePath, totalBytes },
      options,
    );
  };

  list = async (path = './') => {
    return this.list(path)?.map((r) =>
      this.formatFile(parseList(r.longname)[0], r),
    );
  };

  protected _list(path: string) {
    return this.handle<FileEntry[]>(this.wrapper.readdir, path);
  }

  protected _stat(path: string) {
    return this.handle<Stats>(this.wrapper.stat, path);
  }

  size = (path) => {
    return this._stat(path).then((r) => r?.size);
  };

  move = (source, dest) => {
    return this.handle<void>(this.wrapper.rename, source, dest);
  };

  removeFile = (path) => {
    return this.handle<void>(this.wrapper.unlink, path);
  };

  removeEmptyFolder = (path) => {
    return this.handle<void>(this.wrapper.rmdir, path);
  };

  removeFolder = async (path) => {
    const files = await this._list(path);

    if (files.length) {
      for (const file of files) {
        const filePath = path + '/' + file.filename;

        if ((file.attrs as any).isDirectory()) {
          await this.removeFolder(filePath);
        } else {
          await this.removeFile(filePath);
        }
      }
    }

    await this.removeEmptyFolder(path);
  };

  createFolder = (path) => {
    return this.handle<void>(this.wrapper.mkdir, path);
  };

  createEmptyFile = async (path) => {
    const buffer = await this._open(path, 'w');

    if (buffer) {
      await this._close(buffer);
    }
  };

  protected _open(path: string, mode: string | number) {
    return this.handle<Buffer>(this.wrapper.open, path, mode);
  }

  protected _close(buffer: Buffer) {
    return this.handle<void>(this.wrapper.close, buffer);
  }

  pwd = () => {
    return this.handle<string>(this.wrapper.realpath, './');
  };

  send = async (command) => {
    return new Promise<string>(async (resolve, reject) => {
      let stream: ClientChannel;
      let data = '';

      const clear = () => {
        if (stream) {
          stream.close();
        }

        this.removeListener('disconnect', onFinish);
      };

      const onFinish = () => {
        clear();
        resolve(data);
      };

      const onError = (e) => {
        clear();
        reject(e);
      };

      this.once('disconnect', onFinish);

      this.client.exec(command, (err, stream) => {
        if (err) return onError(err);

        stream.on('data', (chunk) => {
          data += chunk;
        });

        stream.once('error', onError);
        stream.once('close', onFinish);
      });
    });
  };

  protected formatFile = (file: FileInfo, entry: FileEntry): IFile => {
    return {
      ...FtpUtils.formatFile(file),
      lastModified: FtpUtils.getDateFromUnixTime(entry.attrs.mtime),
    };
  };

  protected onDisconnect = () => {
    this.connected = false;

    this.client.removeListener('end', this.onDisconnect);
    this.client = null;
    this.wrapper = null;

    this.emit('disconnect');
  };

  protected onKeyboardInteractive = (
    name,
    instructions,
    instructionsLang,
    prompts,
    finish,
  ) => {
    finish([this.config.password]);
  };

  protected handle = <T>(fn: Function, ...args: any[]) => {
    return this.handleNetwork<T>((resolve, reject) => {
      const promise: Promise<T> = promisify(fn).bind(this.wrapper)(...args);

      promise.then(resolve);
      promise.catch(reject);
    });
  };

  protected handleTransfer = (
    source: Readable,
    dest: Writable,
    info: ITransferRequestInfo,
    options: ITransferOptions,
  ) => {
    if (!source || !dest) return null;

    const handler = this.prepareTransfer(info, options);

    return this.handleNetwork<void>(
      (resolve, reject) => {
        let buffered = 0;

        source.on('data', (chunk: Buffer) => {
          buffered += chunk.byteLength;
          handler(buffered);
        });

        source.once('error', reject);
        source.once('close', resolve);
        source.pipe(dest);
      },
      () => {
        source.unpipe(dest);
        source.removeAllListeners();
        this.finishTransfer();
      },
    );
  };

  protected handleNetwork<T>(cb: any, clean?: any) {
    return new Promise<T>((resolve, reject) => {
      const onClean = () => {
        this.removeListener('disconnect', onDisconnect);

        if (clean) {
          clean(onResolve, onReject);
        }
      };

      const onDisconnect = () => onResolve(null);

      const onResolve = (data: any) => {
        onClean();
        resolve(data);
      };

      const onReject = (err: Error) => {
        onClean();
        reject(err);
      };

      this.once('disconnect', onDisconnect);

      cb(onResolve, onReject);
    });
  }
}

import { Writable, Readable, Stream } from 'stream';
import { Client as FtpClient } from 'basic-ftp';
import {  Client as SshClient, SFTPWrapper } from 'ssh2';

import { IConfig, IProtocol, IResponse, ISizeResponse, IProgressEvent, IProgressEventData } from '.';
import { ProgressTracker } from 'basic-ftp/dist/ProgressTracker';

export class Client {
  private _protocol: IProtocol;

  private _ftpClient: FtpClient;

  private _sftpClient: SFTPWrapper;

  private _sshClient: SshClient;

  private _buffered = 0;

  private sftpStream: Readable;
  
  private _localWritable: Writable;

  public onProgress: IProgressEvent;

  public connect(config: IConfig): Promise<IResponse> {
    return new Promise(async (resolve) => {
      const { protocol } = config;
      this._protocol = protocol;

      if (protocol === 'sftp') {
        this._sshClient = new SshClient();

        const onError = (err) => {
          this._sshClient.removeListener('ready', onReady)
          this.disconnect();

          return resolve({
            success: false,
            error: {
              code: err.level,
              message: err.message,
            }
          });
        };

        const onReady = () => {
          this._sshClient.removeListener('error', onError);
          this._sshClient.sftp((err, sftp) => {
            if (err) {
              this.disconnect();
              throw err;
            }

            this._sftpClient = sftp;
            resolve({ success: true });
          });
        }
        
        this._sshClient.once('error', onError);
        this._sshClient.once('ready', onReady);
        this._sshClient.connect({ username: config.user, ...config })
      } else {
        this._ftpClient = new FtpClient();
  
        try {
          await this._ftpClient.access({ secure: true, ...config });
          resolve({ success: true });
        } catch(err) {
          resolve({
            success: false,
            error: {
              code: err.code,
              message: err.message,
            }
          });
        }
      }
    });
  }

  public disconnect() {
    if (this._protocol === 'sftp') {
      this._sshClient.end();
    } else {
      this._ftpClient.close();
    }
    this._protocol = null
    this._ftpClient = null;
    this._sshClient = null;
    this._sftpClient = null;
    this._buffered = 0;
    this.onProgress = null;
  }

  public getSize(remotePath: string): Promise<ISizeResponse> {
    return new Promise(async (resolve) => {
      if (this._protocol === 'sftp') {
        this._sftpClient.stat(remotePath, (err, stats) => {
          if (err) {          
            return resolve({
              success: false,
              error: err.message,
            });
          }
          
          resolve({ success: true, value: stats.size })
        })
      } else {
        try {
          const size = await this._ftpClient.size(remotePath);
          resolve({ success: true, value: size });
        } catch (err) {
          resolve({
            success: false,
            error: {
              code: err.code,
              message: err.message,
            }
          });
        }
      }
    });
  }

  public download(remotePath: string, local: Writable, offset = 0): Promise<IResponse> {
    return new Promise(async (resolve) => {
      const size = await this.getSize(remotePath);
      if (!size.success) return resolve(size);

      this._buffered = 0;

      if (this._protocol === 'sftp') {
        this.sftpStream = this._sftpClient.createReadStream(remotePath, { start: offset });

        this.sftpStream.on('data', (chunk) => {
          this._buffered += chunk.length;
          this._onProgress({
            bytes: this._buffered,
            size: size.value,
            type: 'download',
          });
        });

        this.sftpStream.on('error', (err) => {
          this.sftpStream.destroy();
          resolve({
            success: false,
            error: {
              message: err.message
            }
          });
        });

        this.sftpStream.on('close', () => {
          this.sftpStream.removeAllListeners();
          this.sftpStream.unpipe(local);
          this.sftpStream = null;
          local.end();
          resolve({ success: true });
         });
 
        this.sftpStream.pipe(local);
      } else {
        this._localWritable = local;

        try {
          this._ftpClient.trackProgress(info => {
            this._buffered = info.bytes;

            this._onProgress({
              bytes: info.bytes,
              size: size.value,
              type: 'download'
            });
          });

          await this._ftpClient.download(this._localWritable, remotePath, offset);
          this._ftpClient.trackProgress(undefined);
          this._localWritable.end();
          this._localWritable = null;

          resolve({ success: true });
        } catch (err) {
          this._ftpClient.trackProgress(undefined);

          resolve({
            success: false,
            error: {
              code: err.code,
              message: err.message,
            }
          });
        }
      }
    });
  }

  public async abort() { 
    if (this._protocol === 'sftp') {
      this.sftpStream.emit('error', new Error('Aborted'));
    } else {
      const tracker: ProgressTracker = (this._ftpClient as any).progressTracker;
      tracker.stop();
      (tracker as any).onHandle = undefined;
      (this._ftpClient.ftp as any).task = undefined;
      this._ftpClient.trackProgress(undefined);
      this._ftpClient.ftp.dataSocket.unpipe(this._localWritable);
      this._localWritable.end();
      this._localWritable = null;

      await this._ftpClient.ftp.handle("ABOR", (res, task) => {
        if (res instanceof Error) {
        } else if (res.code === 226) {
          task.resolve(res);
        }
      })
    }

    return this._buffered;
  }

  private _onProgress(data: IProgressEventData) {
    if (typeof this.onProgress === 'function') {
      this.onProgress(data);
    }
  }
};
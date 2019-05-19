import { Client as SshClient, SFTPWrapper } from "ssh2";

import { IConfig } from "./config";

export class SFTPClient {
  private _ssh: SshClient;

  private _wrapper: SFTPWrapper;

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

      this._ssh.connect({ username: config.user, ...config })
    });
  }

  public disconnect() {
    this._ssh.end();
    this._wrapper = null;
    this._ssh = null;
  }

  public size(path: string) {
    return new Promise((resolve, reject) => {
      this._wrapper.stat(path, (err, stats) => {
        if (err) return reject(err);
        resolve({ size: stats.size });
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

  // TODO: Rimraf

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
}

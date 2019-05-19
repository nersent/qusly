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
}

const jsftp = require('jsftp');
import { Client as sshClient, SFTPWrapper } from 'ssh2';
import { SFTPStream } from 'ssh2-streams';

import { IConfig } from "../interfaces";

export class Client {
  public config: IConfig;

  public connected = false;

  public client: any;

  public sshConnection: sshClient;

  // TODO: Error handling
  public connect(config: IConfig) {
    this.config = { ...{
      protocol: 'ftp',
      port: 21,
      username: 'anonymous',
      password: '@anonymous'
    }, ...config };
    

    return new Promise((resolve, reject) => {
      const { protocol } = this.config;

      if (protocol === 'sftp') {
        this.sshConnection = new sshClient();

        this.sshConnection.once('ready', () => {
          this.sshConnection.sftp((err, sftp) => {
            if (err) throw err;
            this.client = sftp;
            this.connected = true;
            resolve();
          })
        });

        this.sshConnection.connect(config);
      } else {
        this.client = new jsftp();

        this.client.once('connect', (err) => {
          if (err) throw err;
          this.connected = true;
          resolve();
        });

        this.client.connect(config);
      }
    });
  }

  // TODO: Error handling
  public disconnect() {
    const { protocol } = this.config;
    if (protocol === 'sftp') {
      this.sshConnection.end();
      this.client.end();
    } else {
      this.client.destroy();
    }
  }
} 
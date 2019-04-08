const jsftp = require('jsftp');
import { Client as sshClient } from 'ssh2';

import { IConfig } from "../interfaces";

export class Client {
  public config: IConfig;

  public connected = false;

  private client: any;

  public connect(config: IConfig) {
    this.config = { ...{
      protocol: 'ftp',
      port: 21,
      username: 'anonymous',
      password: '@anonymous'
    }, ...config };

    return new Promise((resolve, reject) => {
      this.client = this.config.protocol === 'ftp' ? new jsftp() : new sshClient();
      this.client.connect(this.config);
      // TODO: Error handling
      this.client.on('ready', () => {
        resolve();
        this.connected = true;
      })
    });
  }

  public disconnect() {
    const { protocol } = this.config;

    if (protocol === 'ftp') {
      this.client.destroy();
    } else {
      this.client.end();
    }

    this.connected = false;
  }
} 
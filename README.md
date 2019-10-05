# qusly-core

<div align="center">
  <img src="static/logo.png" width="256">

  <h3>
    A powerful FTP client.
  </h3>

  <br />

[![Travis](https://img.shields.io/travis/qusly/qusly-core.svg?style=flat-square)](https://travis-ci.org/xnerhu/qusly-core.svg)
[![NPM](https://img.shields.io/npm/v/qusly-core.svg?style=flat-square)](https://www.npmjs.com/package/qusly-core)
[![NPM](https://img.shields.io/npm/dm/qusly-core?style=flat-square)](https://www.npmjs.com/package/qusly-core)
[![Discord](https://discordapp.com/api/guilds/307605794680209409/widget.png?style=shield)](https://discord.gg/P7Vn4VX)
[![Github](https://img.shields.io/github/followers/xnerhu.svg?style=social&label=Follow)](https://github.com/xnerhu)

</div>

Qusly-core is an API wrapper around [ssh2](https://github.com/mscdex/ssh2) and [basic-ftp](https://github.com/patrickjuchli/basic-ftp) for building **FTP/FTPS/SFTP** clients. It's used in [Qusly](https://www.github.com/qusly/qusly).

<a href="https://www.patreon.com/bePatron?u=21429620">
  <img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="160">
</a>

### Features

- Supports **FTP, FTPS, SFTP**
- Promises
- Lots of utilities like `createBlank`
- Splited transfer
- Automatically calculates **ETA** and **transfer speed**
- MS-dos support

Checkout [roadmap](https://github.com/qusly/qusly-core/projects/) to see what's coming.

## Installing

```bash
$ npm install qusly-core
```

## Quick start

An example of listing files:

```js
import { Client } from 'qusly-core';

async function init() {
  const client = new Client();

  await client.connect({
    host: 'www.example.com',
    user: 'root',
    password: 'password'
    protocol: 'sftp',
    port: 22,
  });

  const files = await client.readDir('/documents');
  console.log(files);

  await client.disconnect();
}

init();
```

Example output:

```js
[
  {
    name: 'projects',
    type: 'directory',
    size: 4096,
    ext: ''
    user: 'root',
    group: 'root',
    date: '2019-05-10T18:52:00.000Z', // obj Date
    permissions: {
      user: 6,
      group: 6
    },
  },
  {
    name: 'logs.txt',
    type: 'file',
    ext: 'txt'
    size: 43,
    user: 'root',
    group: 'root',
    date: '2019-05-29T22:00:00.000Z', // obj Date
    permissions: {
      user: 6,
      group: 6
    },
  },
]

```

## API

Class `Client`:

- [`Client.abort`](#clientAbort)
- [`Client.connect`](#clientConnect)
- [`Client.createBlank`](#clientCreateBlank)
- [`Client.delete`](#clientDelete)
- [`Client.disconnect`](#clientDisconnect)
- [`Client.download`](#clientDownload)
- [`Client.exists`](#clientExists)
- [`Client.mkdir`](#clientMkdir)
- [`Client.move`](#clientMove)
- [`Client.pwd`](#clientPwd)
- [`Client.readDir`](#clientReadDir)
- [`Client.rimraf`](#clientRimraf)
- [`Client.send`](#clientSend)
- [`Client.size`](#clientSize)
- [`Client.stat`](#clientStat)
- [`Client.touch`](#clientTouch)
- [`Client.unlink`](#clientUnlink)
- [`Client.upload`](#clientUpload)

Class `TransferClient`:

- [`TransferClient`](#transferClientConstructor)
- [`TransferClient.connect`](#transferClientConnect)
- [`TransferClient.getSplits`](#transferClientGetSplits)
- [`TransferClient.setSplits`](#transferClientSetSplits)
- [`TransferClient.transfer`](#transferClientTransfer)

Interfaces:

- [`IConfig`](#config)
- [`IDownloadOptions`](#downloadOptions)
- [`IFile`](#file)
- [`IProgress`](#progress)
- [`IStats`](#stats)
- [`ITransferClientNew`](#transferClientNew)
- [`ITransferClientProgress`](#transferClientProgress)
- [`ITransferOptions`](#transferOptions)

Types:

- [`IFileType`](#fileType)
- [`IProtocol`](#protocol)
- [`ITransferType`](#transferType)

Events:

- [`Client.on('abort')`](#clientOnAbort)
- [`Client.on('connect')`](#clientOnConnect)
- [`Client.on('disconnect')`](#clientOnDisconnect)
- [`Client.on('progress')`](#clientOnProgress)
- [`TransferClient.on('new')`](#transferClientOnNew)
- [`TransferClient.on('progress')`](#transferClientOnProgress)

### Class `Client`

#### Methods

<a name="clientAbort"></a>

- `Client.abort(): Promise<void>`
  <br />
  Aborts current data transfer. It closes all used file streams.
  <br />

  ```js
  const bytes = await client.abort();

  console.log(`Aborted at ${bytes} bytes`);
  ```

<a name="clientConnect"></a>

- `Client.connect(config: IConfig): Promise<void>`
  <br />
  Connects to server. You can use it to reload session.
  <br />

  ```js
  try {
    await client.connect({
      host: 'www.example.com',
      user: 'root', // default anonymous
      password: 'password', // default @anonymous
      protocol: 'ftp', // default ftp
      port: 21, // default 21
    });

    console.log('Connected!');
  } catch (error) {
    console.log('Failed to connect!', res.error);
  }
  ```

<a name="clientCreateBlank"></a>

- `Client.createBlank(type: 'folder' | 'file', path = './', files?: IFile[]): Promise<string>`
  <br />
  Creates an empty folder or file with unique name. If you've fetched files already, you can provide last argument to don't refetch files.
  <br />

  ```js
  const res = await client.createBlank('folder');

  console.log(`Created new folder - ${res.fileName}`);
  ```

<a name="clientDelete"></a>

- `Client.delete(path: string): Promise<void>`
  <br />
  An universal method to remove both files and folders.
  <br />

  ```js
  await client.delete('folder');

  console.log('Deleted');
  ```

<a name="clientDisconnect"></a>

- `Client.disconnect(): Promise<void>`
  <br />
  Disconnects from server. Closes all opened sockets and file streams.
  <br />

  ```js
  await client.disconnect();

  console.log('Disconnected!');
  ```

<a name="clientDownload"></a>

- `Client.download(path: string, dest: Writable, options?: IDownloadOptions): Promise<void>`
  <br />
  Downloads a file. You can start at given offset by setting options to

  ```js
  {
    startAt: 65.536;
  }
  ```

  <br />

  ```js
  import { createWriteStream } from 'fs';
  import { resolve } from 'path';

  const localPath = resolve('downloads', 'downloaded.rar');

  client.on('progress', e => {
    const rate = ((e.buffered / e.size) * 100).toFixed(2);

    console.log(`${rate}% ETA: ${e.eta}s`);
  });

  await client.download('file.rar', createWriteStream(localPath));

  console.log('Downloaded!');
  ```

<a name="clientExists"></a>

- `Client.exists(path: string): Promise<boolean>`
  <br />
  Checks if file exists.
  <br />

  ```js
  const exists = await client.exists('/home/image.png');

  if (exists) {
    console.log('File exists');
  } else {
    console.log("File doesn't exists");
  }
  ```

<a name="clientMkdir"></a>

- `Client.mkdir(path: string): Promise<void>`
  <br />
  Creates a directory.
  <br />

  ```js
  await client.mkdir('/home/documents/new folder');

  console.log(`Created a new directory`);
  ```

<a name="clientMove"></a>

- `Client.move(srcPath: string, destPath: string): Promise<void>`
  <br />
  Moves a file from **`srcPath`** to **`destPath`**.
  <br />

  ```js
  await client.move('music/film.mp4', 'videos/film.mp4');

  console.log('Moved');
  ```

<a name="clientPwd"></a>

- `Client.pwd(): Promise<IPwdRes>`
  <br />
  Returns path of current working directory.
  <br />

  ```js
  const path = await client.pwd();

  console.log(`You're at ${path}`);
  ```

<a name="clientReadDir"></a>

- `Client.readDir(path?: string): Promise<IFile[]>`
  <br />
  Reads content of a directory. If you don't provide path, it'll use working directory.
  <br />

  ```js
  const files = await client.readDir('/root/');

  console.log(files);
  ```

<a name="clientRimraf"></a>

- `Client.rimraf(path: string): Promise<void>`
  <br />
  Removes a **directory** and all of its content, recursively.
  <br />

  ```js
  await client.rimraf('videos');

  console.log('Removed all files');
  ```

<a name="clientSend"></a>

- `Client.send(command: string): Promise<string>`
  <br />
  Sends a raw command. **Output depends on a protocol and server support!**
  <br />

  ```js
  // It'll probably work on SFTP
  const res = await client.send('whoami');

  console.log(res);
  ```

<a name="clientSize"></a>

- `Client.size(path: string): Promise<number>`
  <br />
  Returns size of a file or folder in **bytes**.
  <br />

  ```js
  const size = await client.size('file.rar');

  console.log(`Size: ${size} bytes`);
  ```

<a name="clientStat"></a>

- `Client.stat(path: string): Promise<IStats>`
  <br />
  Returns info about file at given path.
  <br />

  ```js
  const res = await client.stat('/documents/unknown');

  console.log(`${res.type} - ${res.size} bytes`);
  ```

<a name="clientTouch"></a>

- `Client.touch(path: string): Promise<IRes>`
  <br />
  Creates an empty **file**.
  <br />

  ```js
  await client.touch('./empty file.txt');

  console.log('Created a new file!');
  ```

<a name="clientUnlink"></a>

- `Client.unlink(path: string): Promise<IRes>`
  <br />
  Removes a **file** at **`path`**.
  <br />

  ```js
  await client.unlink('videos/file.mp4');

  console.log('Removed a file');
  ```

<a name="clientUpload"></a>

- `Client.upload(path: string, source: Readable, options?: ITransferOptions): Promise<void>`
  <br />
  Uploads a file.
  <br />

  ```js
  import { createReadStream, statSync } from 'fs';
  import { resolve } from 'path';

  const localPath = resolve('uploads', 'file.jpg');
  const fileSize = statSync(localPath).size;

  client.on('progress', e => {
    const rate = ((e.buffered / e.size) * 100).toFixed(2);

    console.log(`${rate}% ETA: ${e.eta}s`);
  });

  await client.upload('uploaded file.jpg', createReadStream(path));

  console.log('Uploaded');
  ```

### Class `TransferClient`

An utility class to split transfers.

#### Methods

<a name="transferClientConstructor"></a>

- `TransferClient(type: ITransferType, splits = 1)`

<a name="transferClientConnect"></a>

- `TransferClient.connect(config: IConfig): Promise<void>`
  <br />
  Connects clients to server.
  <br />

  ```js
  await client.connect({
    host: 'www.example.com',
  });

  console.log(`All clients are connected!`);
  ```

<a name="transferClientGetSplits"></a>

- `TransferClient.getSplits(): number`
  <br />
  Gets splits length.

<a name="transferClientSetSplits"></a>

- `TransferClient.setSplits(count: number, config?: IConfig): Promise<void>`
  <br />
  Sets splits. If you're setting more than you had, you must provide config. If you're setting less than you had, it will automatically close rest of client.
  <br />

  ```js
  const client = new TransferClient('download', 2);

  console.log(client.getSplits()); // 2

  await client.setSplits(6, {
    host: 'www.example.com',
  });

  console.log(client.getSplits()); // 6

  await client.setSplits(4);

  console.log(client.getSplits()); // 4
  ```

<a name="transferClientTransfer"></a>

- `TransferClient.transfer(localPath: string, remotePath: string, id?: string): Promise<void>`
  <br />
  Transfers a file. You can set your own `id` or it'll be unique hash. To track progress, use event `progress`. With 2 splits, you can transfer files twice as fast.
  <br />

  ```js
  await client.transfer('logs.txt', '/documents/logs.txt');
  await client.transfer('video.mp4', '/content/video.mp4');
  ```

<a name="config"></a>

### Interface `IConfig`

```ts
interface IConfig {
  protocol?: IProtocol;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
}
```

<a name="downloadOptions"></a>

### Interface `IDownloadOptions`

```ts
interface IDownloadOptions extends ITransferOptions {
  startAt?: number;
}
```

<a name="file"></a>

### Interface `IFile`

```ts
interface IFile {
  name?: string;
  type?: IFileType;
  size?: number;
  user?: string;
  group?: string;
  date?: Date;
  ext?: string;
  permissions?: {
    user?: number;
    group?: number;
  };
}
```

<a name="progress"></a>

### Interface `IProgress`

```ts
interface IProgress {
  chunkSize?: number; // single chunk size in bytes
  buffered?: number; // already buffered size in bytes
  size?: number; // file size in bytes
  localPath?: string; // local file path
  remotePath?: string; // remote file path
  eta?: number; // estimated time arrival in seconds
  speed?: number; // transfer speed in KB/s
  startAt?: Date; // transfer start
  context?: Client;
}
```

<a name="stats"></a>

### Interface `IStats`

```ts
interface IStats {
  size?: number;
  type?: IFileType;
}
```

<a name="transferClientNew"></a>

### Interface `ITransferClientNew`

```ts
interface ITransferClientNew {
  id?: string;
  type?: ITransferType;
  localPath?: string;
  remotePath?: string;
  context?: Client;
}
```

<a name="transferClientProgress"></a>

### Interface `ITransferClientProgress`

```ts
interface ITransferClientProgress extends IProgress {
  id?: string;
  type?: ITransferType;
}
```

<a name="transferOptions"></a>

### Interface `ITransferOptions`

```ts
interface ITransferOptions {
  quiet?: boolean;
}
```

<a name="fileType"></a>

### Type `IFileType`

```ts
type IFileType = 'unknown' | 'file' | 'folder' | 'symbolic-link';
```

<a name="protocol"></a>

### Type `IProtocol`

```ts
type IProtocol = 'sftp' | 'ftp' | 'ftps';
```

<a name="transferType"></a>

### Type `ITransferType`

```ts
type ITransferType = 'download' | 'upload';
```

### Events

**Client**

<a name="clientOnAbort"></a>

- `Client.on('abort')` - File transfer has been aborted.

<a name="clientOnConnect"></a>

- `Client.on('connect')` - Client has connected to server.

<a name="clientOnDisconnect"></a>

- `Client.on('disconnect')` - Client has disconnected from server.

<a name="clientOnProgress"></a>

- `Client.on('progress', e: IProgress)` - Triggered while transfering a file.
  <br />

  ```ts
  client.on('progress', (e: IProgress) => {
    const { buffered, size, eta, speed } = data;
    const percent = (bytes / size * 100).toFixed(2);

    console.log(`${buffered}/${size}, ETA: ${eta}s, speed: ${speed}KB/s`);
  });

  client.download(...);
  ```

**TransferClient**

<a name="transferClientOnNew"></a>

- `TransferClient.on('new', e: ITransferClientNew)` - Invoked on every new file transfer.

<a name="transferClientOnProgress"></a>

- `TransferClient.on('progress', e: ITransferClientProgress)` - Triggered while transfering a file.
  This event comes with a lot of information. Some of that are:
  - Id, which you can use to identify transfer.
  - Type of transfer `ITransferType`
  - Single chunk size in _bytes_
  - Buffered size
  - File size
  - Estimated time arrival in _seconds_
  - Transfer speed in _KB/s_
  - Start time

```ts
client.on('progress', (e: ITransferClientProgress) => {
  const { id, type, eta } = data;

  console.log(`${id}: ${eta}s (${type}`);
});

client.transfer(...);
```

# Related

- [Qusly](https://www.github.com/qusly/qusly) - Elegant, full-featured FTP client.

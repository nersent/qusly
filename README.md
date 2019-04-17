# qusly-core

[![Travis](https://img.shields.io/travis/xnerhu/qusly-core.svg?style=flat-square)](https://travis-ci.org/xnerhu/qusly-core.svg)
[![NPM](https://img.shields.io/npm/v/qusly-core.svg?style=flat-square)](https://www.npmjs.com/package/qusly-core)

An API wrapper around [ssh2](https://github.com/mscdex/ssh2) and [basic-ftp](https://github.com/patrickjuchli/basic-ftp) for building **FTP/FTPS/SFTP** clients.

## Installing

```bash
$ npm install qusly-core
```

## Quick start

An example of listing files:

```js
const { Client } = require('qusly-core');

async function init() {
  const client = new Client();

  // Connect to the server
  await client.connect({
    host: 'www.example.com',
    user: 'root', // default anonymous
    password: 'password', // default @anonymous
    protocol: 'ftp', // default ftp
    port: 21, // default 21
  });

  // List all files
  const { files } = await client.ls('./');
  // Print listed files
  console.log(files);

  // Disconnect
  await client.disconnect();
}

init();
```

The output would be something like this:

```js
[
  {
    name: 'image.jpg',
    type: 1,
    size: 41582,
    date: [object Date],
    permissions: {
      user: 6,
      group: 6
    },
    user: 'root',
    group: 'root'
  }
]

```

## API

Class `Client`:

- [`Client.connect`](#clientConnect)
- [`Client.disconnect`](#clientDisconnect)
- [`Client.getSize`](#clientGetSize)
- [`Client.upload`](#clientUpload)
- [`Client.download`](#clientDownload)
- [`Client.abort`](#clientAbort)
- [`Client.send`](#clientSend)
- [`Client.move`](#clientMove)
- [`Client.remove`](#clientRemove)
- [`Client.removeDir`](#clientRemoveDir)
- [`Client.createDir`](#clientCreateDir)
- [`Client.ls`](#clientLs)
- [`Client.connected`](#clientConnected)
- [`Client.debugger`](#clientDebugger)

Interfaces:

- [`IConnectionConfig`](#connectionConfig)
- [`IProgressEvent`](#progressEvent)
- [`IResponse`](#response)
- [`ISizeResponse`](#sizeResponse)
- [`IAbortResponse`](#abortResponse)
- [`ISendResponse`](#sendResponse)
- [`ILsResponse`](#lsResponse)

Enums:

- [`File`](#file)
- [`FileType`](#fileType)

Events:

- [`client.on('connect')`](#clientOnConnect)
- [`client.on('disconnect')`](#clientOnDisconnect)
- [`client.on('abort')`](#clientOnAbort)
- [`client.on('progress')`](#clientOnProgress)

Other:

- [`IProtocol`](#protocol)

<a name="client"></a>

### Class `Client`

<a name="clientMethods"></a>

#### Methods

<a name="clientConnect"></a>

- `Client.connect(config: ConnectionConfig): Promise<IResponse>`
  <br />
  Connects to server.
  <br />

  ```js
  const res = await client.connect({
    host: 'www.example.com',
    user: 'root', // default anonymous
    password: 'password', // default @anonymous
    protocol: 'ftp', // default ftp
    port: 21, // default 21
  });

  if (res.success) {
    console.log('Connected!');
  } else {
    console.log('Failed to connect!', res.error);
  }
  ```

<a name="clientDisconnect"></a>

- `Client.disconnect(): void`
  <br />
  Disconnects from server.
  <br />

  ```js
  client.disconnect();
  console.log('Disconnected!');
  ```

<a name="clientgetSize"></a>

- `Client.getSize(path: string): Promise<ISizeResponse>`
  <br />
  Gets size of a file.
  <br />

  ```js
  const res = await client.getSize('file.rar');

  if (res.success) {
    console.log('Size: ', res.size);
  } else {
    console.log('Error occured: ', res.err);
  }
  ```

<a name="clientUpload"></a>

- `Client.upload(path: string, source: Readable, fileSize?: number): Promise<IResponse>`
  <br />
  Uploads a file.
  <br />

  ```js
  const { createReadStream, statSync } = require('fs');
  const { resolve } = require('path');

  const localPath = resolve('uploads', 'file to upload.jpg');
  const fileSize = statSync(localPath).size;

  const res = await client.upload(
    'image.jpg',
    createReadStream(path),
    fileSize,
  ); // Setting file size is optional

  if (res.success) {
    console.log('Uploaded');
  } else {
    console.log('Error occured/Aborted: ', res.error);
  }
  ```

<a name="clientDownload"></a>

- `Client.download(path: string, destination: Writable, startAt = 0): Promise<IResponse>`
  <br />
  Downloads a file. You can start at given offset by setting **`startAt`**.
  <br />

  ```js
  const { createWriteStream } = require('fs');
  const { resolve } = require('path');

  const localPath = resolve('downloads', 'downloaded file.rar');

  const res = await client.download('file.rar', createWriteStream(localPath));

  if (res.success) {
    console.log('Downloaded');
  } else {
    console.log('Error occured/Aborted: ', res.error);
  }
  ```

- `Client.abort(): Promise<IAbortResponse>`
  <br />
  Aborts the current data transfer like downloading or uploading.
  <br />

  ```js
  const res = await client.abort();

  if (res.success) {
    console.log(`Aborted at ${res.bytes} bytes`);
  } else {
    console.log('Error occured: ', res.error);
  }
  ```

<a name="clientSend"></a>

- `Client.send(command: string): Promise<ISendResponse>`
  <br />
  Sends a raw command. **Output depends on a protocol and server support!**
  <br />

  ```js
  // Probably will work on SFTP
  const res = await client.send('whoami');

  if (res.success) {
    console.log(res.message);
  } else {
    console.log('Error occured: ', res.err);
  }
  ```

<a name="clientMove"></a>

- `Client.move(srcPath: string, destPath: string): Promise<IResponse>`
  <br />
  Moves a file from **`srcPath`** to **`destPath`**.
  <br />

  ```js
  const res = await client.move('music/file.mp4', 'videos/file.mp4');

  if (res.success) {
    console.log('Moved');
  } else {
    console.log('Error occured: ', res.err);
  }
  ```

<a name="clientRemove"></a>

- `Client.remove(path: string): Promise<IResponse>`
  <br />
  Removes a **file** at **`path`**.
  <br />

  ```js
  const res = await client.remove('videos/file.mp4');

  if (res.success) {
    console.log('Removed');
  } else {
    console.log('Error occured: ', res.err);
  }
  ```

<a name="clientRemoveDir"></a>

- `Client.removeDir(path: string): Promise<IResponse>`
  <br />
  Removes a **directory** at **`path`** and all of its content.
  <br />

  ```js
  const res = await client.remove('videos');

  if (res.success) {
    console.log('Removed');
  } else {
    console.log('Error occured: ', res.err);
  }
  ```

<a name="clientCreateDir"></a>

- `Client.createDir(path: string): Promise<IResponse>`
  <br />
  Creates a directory at **`path`**.
  <br />

  ```js
  const res = await client.createDir('new folder');

  if (res.success) {
    console.log('Created a directory');
  } else {
    console.log('Error occured: ', res.err);
  }
  ```

<a name="clientLs"></a>

- `Client.ls(path: string): Promise<ILsResponse>`
  <br />
  Lists all files at **`path`**.
  <br />

  ```js
  const res = await client.ls('music');

  if (res.success) {
    console.log(res.files);
  } else {
    console.log('Error occured: ', res.err);
  }
  ```

<a name="clientProperties"></a>

#### Properties

<a name="clientConnected"></a>

- `Client.connected: boolean` - Indicates if client is connected.

<a name="clientDebugger"></a>

- `set/get Client.debugger` - Debugger. **Currently works only with FTP**.
  <br />
  ```ts
  client.debugger = true;
  ```

<a name="iConnectionConfig"></a>

### Interface `connectionConfig`

```ts
interface IConnectionConfig {
  protocol?: IProtocol;
  host: string;
  port?: number;
  user?: string;
  password?: string;
}
```

<a name="protocol"></a>

### Type `IProtocol`

```ts
type IProtocol = 'ftp' | 'sftp';
```

<a name="file"></a>

### Enum `File`

```ts
interface File {
  name: string;
  type: FileType;
  size: number;
  user: string;
  group: string;
  date: Date;
  permissions: {
    user: number;
    group: number;
  };
}
```

<a name="fileType"></a>

### Enum `FileType`

```ts
enum FileType {
  Unknown = 0,
  File,
  Directory,
  SymbolicLink,
}
```

- [`Client.connect`](#clientConnect)

<a name="progressEvent"></a>

### Interface `IProgressEvent`

```ts
interface IProgressEvent {
  type: 'download' | 'upload';
  path: string;
  bytes: number;
  fileSize?: number;
}
```

- [`Client.on('progress')`](#clientOnProgress)

<a name="response"></a>

### Interface `IResponse`

```ts
interface IResponse {
  success: boolean;
  error?: {
    code?: string | number;
    message?: string;
  };
}
```

- [`Client.connect`](#clientConnect)
- [`Client.upload`](#clientUpload)
- [`Client.download`](#clientDownload)
- [`Client.move`](#clientMove)
- [`Client.remove`](#clientRemove)
- [`Client.removeDir`](#clientRemoveDir)
- [`Client.createDir`](#clientCreateDir)

<a name="sizeResponse"></a>

### Interface `ISizeResponse`

```ts
interface ISizeResponse extends IResponse {
  size?: number;
}
```

- [`Client.getSize`](#clientGetSize)

<a name="abortResponse"></a>

### Interface `IAbortResponse`

```ts
interface IAbortResponse extends IResponse {
  bytes?: number;
}
```

- [`Client.abort`](#clientAbort)

<a name="sendResponse"></a>

### Interface `ISendResponse`

```ts
interface ISendResponse extends IResponse {
  message?: string;
}
```

- [`Client.send`](#clientSend)

<a name="lsResponse"></a>

### Interface `ILsResponse`

```ts
interface ILsResponse extends IResponse {
  files?: File[];
}
```

- [`Client.ls`](#clientLs)

### Events

<a name="clientOnConnect"></a>

- `client.on('connect')` - Client has connected to server.

<a name="clientOnDisconnect"></a>

- `client.on('disconnect')` - Client has disconnected from server.

<a name="clientOnAbort"></a>

- `client.on('abort')` - File transfer has been aborted.

<a name="clientOnProgress"></a>

- `client.on('progress')` - Triggered while e.g downloading a file.
  <br />

  ```ts
  client.on('progress', (data: IProgressEvent) => {
    const { bytes, fileSize, path } = data;
    const percent = (bytes / fileSize) * 100;

    console.log(`${path}: ${percent}`);
  });

  client.download(...);
  ```

# Tests

Coming soon...

# Related

- [Qusly](https://www.github.com/xnerhu/qusly) - A FTP/SFTP client with Material Design UI.

# qusly-core

[![Travis](https://img.shields.io/travis/qusly/qusly-core.svg?style=flat-square)](https://travis-ci.org/xnerhu/qusly-core.svg)
[![NPM](https://img.shields.io/npm/v/qusly-core.svg?style=flat-square)](https://www.npmjs.com/package/qusly-core)

An API wrapper around [ssh2](https://github.com/mscdex/ssh2) and [basic-ftp](https://github.com/patrickjuchli/basic-ftp) for building **FTP/FTPS/SFTP** clients used in [Qusly](https://www.github.com/qusly/qusly).

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

  await client.connect({
    host: 'www.example.com',
    user: 'root', // default anonymous
    password: 'password', // default @anonymous
    protocol: 'ftp', // default ftp
    port: 21, // default 21
  });

  const res = await client.readDir('./');
  console.log(res);

  await client.disconnect();
}

init();
```

Example output:

```js
{
  success: true,
  files: [
    {
      name: 'my documents',
      type: 'directory',
      size: 4096,
      ext: ''
      user: 'root',
      group: 'root',
      date: '2019-05-10T18:52:00.000Z',
      permissions: {
        user: 6,
        group: 6
      },
    },
    {
      name: 'wallpaper.png',
      type: 'file',
      ext: 'png'
      size: 43,
      user: 'root',
      group: 'root',
      date: '2019-05-29T22:00:00.000Z',
      permissions: {
        user: 6,
        group: 6
      },
    },
  ]
}

```

## API

Class `Client`:

- [`Client.abort`](#clientAbort)
- [`Client.connect`](#clientConnect)
- [`Client.createBlank`](#clientCreateBlank)
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
- [`Client.touch`](#clientTouch)
- [`Client.unlink`](#clientUnlink)
- [`Client.upload`](#clientUpload)

Class `Traversal`:

- [`Traversal.connect`](#traversalConnect)
- [`Traversal.init`](#traversalInit)

Interfaces:

- [`IConfig`](#config)
- [`IFile`](#file)
- [`IProgressEvent`](#progressEvent)
- [`IRes`](#res)
- [`ISizeRes`](#sizeRes)
- [`ISendRes`](#sendRes)
- [`IPwdRes`](#pwdRes)
- [`IReadDirRes`](#readDirRes)
- [`IAbortRes`](#abortRes)
- [`ICreateBlankRes`](#createBlankRes)
- [`ITraversalItem`](#traversalItem)
- [`ITraversalOptions`](#traversalOptions)

Types:

- [`IFileType`](#fileType)
- [`IProtocol`](#protocol)

Events:

- [`Client.on('connect')`](#clientOnConnect)
- [`Client.on('disconnect')`](#clientOnDisconnect)
- [`Client.on('abort')`](#clientOnAbort)
- [`Client.on('progress')`](#clientOnProgress)
- [`Traversal.on('fetch')`](#traversalOnFetch)
- [`Traversal.on('finish')`](#traversalOnFinish)

### Class `Client`

#### Methods

<a name="clientAbort"></a>

- `Client.abort(): Promise<IAbortRes>`
  <br />
  Aborts the current data transfer.
  <br />

  ```js
  const { bytes } = await client.abort();

  console.log(`Aborted at ${res.bytes} bytes`);
  ```

<a name="clientConnect"></a>

- `Client.connect(config: IConfig): Promise<IRes>`
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

<a name="clientCreateBlank"></a>

- `Client.createBlank(type: 'folder' | 'file', path = './', files?: IFile[]): Promise<ICreateBlankRes>`
  <br />
  Creates an empty folder or file with unique name;
  <br />

  ```js
  const res = await client.createBlank('folder');

  console.log(`Created ${res.fileName}`);
  ```

<a name="clientDisconnect"></a>

- `Client.disconnect(): Promise<IRes>`
  <br />
  Disconnects from server. Closes all opened sockets.
  <br />

  ```js
  await client.disconnect();

  console.log('Disconnected!');
  ```

<a name="clientDownload"></a>

- `Client.download(path: string, destination: Writable, startAt = 0): Promise<IRes>`
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
    console.log('Error occured or aborted');
  }
  ```

<a name="clientExists"></a>

- `Client.exists(path: string): Promise<boolean>`
  <br />
  Checks if file exists.
  <br />

  ```js
  const path = '/home/index.ts';
  const exists = await client.exists(path);

  if (exists) {
    console.log('File exists');
  } else {
    console.log("File doesn't exists");
  }
  ```

<a name="clientMkdir"></a>

- `Client.mkdir(path: string): Promise<IRes>`
  <br />
  Creates a directory.
  <br />

  ```js
  const path = '/home/documents/new folder';
  const res = await client.mkdir(path);

  console.log(`Created a directory at ${path}`);
  ```

<a name="clientPwd"></a>

- `Client.pwd(): Promise<IPwdRes>`
  <br />
  Gets path of the current working directory.
  <br />

  ```js
  const { path } = await client.pwd();

  console.log(`Current path: ${path}`);
  ```

<a name="clientReadDir"></a>

- `Client.readDir(path?: string): Promise<IReadDirRes>`
  <br />
  Reads the content of a directory.
  <br />

  ```js
  const { files } = await client.readDir('/root/');

  console.log('Files', files);
  ```

<a name="clientMove"></a>

- `Client.move(srcPath: string, destPath: string): Promise<IRes>`
  <br />
  Moves a file from **`srcPath`** to **`destPath`**.
  <br />

  ```js
  const res = await client.move('music/file.mp4', 'videos/file.mp4');

  if (res.success) {
    console.log('Moved');
  } else {
    console.log('Error occured');
  }
  ```

<a name="clientRimraf"></a>

- `Client.rimraf(path: string): Promise<IRes>`
  <br />
  Removes a **directory** and all of its content.
  <br />

  ```js
  const path = 'videos';
  const res = await client.rimraf(path);

  console.log(`Removed all files at ${path}`);
  ```

<a name="clientSend"></a>

- `Client.send(command: string): Promise<ISendRes>`
  <br />
  Sends a raw command. **Output depends on a protocol and server support!**
  <br />

  ```js
  // Probably will work on SFTP
  const { message } = await client.send('whoami');

  console.log(message);
  ```

<a name="clientSize"></a>

- `Client.size(path: string): Promise<ISizeRes>`
  <br />
  Gets size of a file in bytes.
  <br />

  ```js
  const { size } = await client.size('file.rar');

  console.log(`Size: ${size}`);
  ```

<a name="clientTouch"></a>

- `Client.touch(path: string): Promise<IRes>`
  <br />
  Creates an empty file.
  <br />

  ```js
  const res = await client.touch('./empty file.txt');

  if (res.success) {
    console.log('Created an empty file');
  } else {
    console.log('Error occured');
  }
  ```

<a name="clientUnlink"></a>

- `Client.unlink(path: string): Promise<IRes>`
  <br />
  Removes a **file** at **`path`**.
  <br />

  ```js
  const res = await client.unlink('videos/file.mp4');

  if (res.success) {
    console.log('Removed');
  } else {
    console.log('Error occured');
  }
  ```

<a name="clientUpload"></a>

- `Client.upload(path: string, source: Readable, fileSize?: number): Promise<IRes>`
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
    fileSize, // Optional but recommended for further tracking the progress
  );

  if (res.success) {
    console.log('Uploaded');
  } else {
    console.log('Error occured or aborted');
  }
  ```

### Class `Traversal`

An utility for tree traversal.

#### Methods

<a name="traversalConnect"></a>

- `Traversal.connect(config: IConfig): Promise<IRes>`

<a name="traversalInit"></a>

- `Traversal.init(options: ITreeOptions): Promise<void>`
  <br />
  Starts traversing tree. You can set `options` to for example change max depth.
  <br />

  ```js
  const tree = new Traversal();

  tree.on('fetch', item => {
    console.log(item.path);
  });

  await tree.init({
    path: '/',
    maxDepth: 0,
    filter: item => {
      return item.file.type === 'directory';
    },
  });

  console.log('Finished traversing!');
  ```

<a name="config"></a>

### Interface `IConfig`

```ts
interface IConfig {
  protocol?: IProtocol;
  host: string;
  port?: number;
  user?: string;
  password?: string;
}
```

<a name="file"></a>

### Interface `IFile`

```ts
interface IFile {
  name: string;
  type: IFileType;
  size: number;
  user: string;
  group: string;
  date: Date;
  ext: string;
  permissions: {
    user: number;
    group: number;
  };
}
```

<a name="progressEvent"></a>

### Interface `IProgressEvent`

```ts
interface IProgressEvent extends IStreamInfo {
  bytes: number;
}
```

<a name="res"></a>

### Interface `IRes`

```ts
interface IRes {
  success: boolean;
  error?: Error;
}
```

<a name="sizeRes"></a>

### Interface `ISizeRes`

```ts
interface ISizeRes extends IRes {
  size?: number;
}
```

<a name="sendRes"></a>

### Interface `ISendRes`

```ts
interface ISendRes extends IRes {
  message?: string;
}
```

<a name="pwdRes"></a>

### Interface `IPwdRes`

```ts
interface IPwdRes extends IRes {
  path?: string;
}
```

<a name="readDirRes"></a>

### Interface `IReadDirRes`

```ts
interface IReadDirRes extends IRes {
  files?: IFile[];
}
```

<a name="abortRes"></a>

### Interface `IAbortRes`

```ts
interface IAbortRes extends IRes {
  bytes?: number;
}
```

<a name="createBlankRes"></a>

### Interface `ICreateBlankRes`

```ts
interface ICreateBlankRes extends IRes {
  fileName?: string;
}
```

<a name="traversalItem"></a>

### Interface `ITraversalItem`

```ts
interface ITraversalItem {
  path?: string;
  file?: IFile;
}
```

<a name="traversalOptions"></a>

### Interface `ITraversalOptions`

```ts
interface ITraversalOptions {
  path?: string;
  maxDepth?: number;
  filter?: (item: ITraversalItem) => boolean;
}
```

### Type `IProtocol`

```ts
type IProtocol = 'sftp' | 'ftp' | 'ftps';
```

### Type `IFileType`

```ts
type IFileType = 'unknown' | 'file' | 'directory' | 'symbolic-link';
```

### Events

**Client**

<a name="clientOnConnect"></a>

- `Client.on('connect')` - Client has connected to server.

<a name="clientOnDisconnect"></a>

- `Client.on('disconnect')` - Client has disconnected from server.

<a name="clientOnAbort"></a>

- `Client.on('abort')` - File transfer has been aborted.

<a name="clientOnProgress"></a>

- `Client.on('progress')` - Triggered while transfering a file.
  <br />

  ```ts
  client.on('progress', (data: IProgressEvent) => {
    const { bytes, size, path } = data;
    const percent = (bytes / size * 100).toFixed(2);

    console.log(`${path}: ${percent}%`);
  });

  client.download(...);
  ```

**Traversal**

<a name="traversalOnFetch"></a>

- `Traversal.on('fetch')` - Invoked when file is fetched.
  <br />

  ```ts
  tree.on('fetch', (item: ITreeItem) => {
    const { path, file } = item;

    console.log(`${path}: ${file.size}`);
  });
  ```

<a name="traversalOnFinish"></a>

- `Traversal.on('finish')` - Invoked on finish.

# Related

- [Qusly](https://www.github.com/qusly/qusly) - full-featured FTP client.

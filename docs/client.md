# Qusly-Core documentation

## Table of contents

- [Client](#/docs/client.md)
  - [Event: 'abort'](#clientEventAbort)
  - [Event: 'connected'](#clientEventConnected)
  - [Event: 'disconnected'](#clientEventDisconnected)
  - [Event: 'progress'](#clientEventProgress)
  - [client.abort()](#clientAbort)
  - [client.config](#clientInternalConfig)
  - [client.connect(config)](#clientConnect)
  - [client.connected](#clientConnected)
  - [client.createBlank(type, [, path][, files])](#clientCreateBlank)
  - [client.delete(path)](#clientDelete)
  - [client.disconnect()](#clientDisconnect)
  - [client.download(path, dest, [, options])](#clientDownload)
  - [client.exists(path)](#clientExists)
  - [client.mkdir(path)](#clientMkdir)
  - [client.move(srcPath, destPath)](#clientMove)
  - [client.pwd()](#clientPwd)
  - [client.readDir([, path])](#clientReadDir)
  - [client.rimraf(path)](#clientRimraf)
  - [client.send(command)](#clientSend)
  - [client.size(path)](#clientSize)
  - [client.stat(path)](#clientStat)
  - [client.touch(path)](#clientTouch)
  - [client.unlink(path)](#clientUnlink)
  - [client.upload(path, source, [, options])](#clientUpload)

<a name="client"></a>

### Class `Client`

> An API, which provides access to FTP/FTPS/SFTP server. It handles every method in a queue.

<a name="clientEventAbort"></a>

#### Event: 'abort'

- `context` [Client](#client)

Emitted when the [client.abort()](#) has been called and before any reconnection is requested.

<a name="clientEventConnected"></a>

#### Event: 'connected'

- `context` [Client](#client)

Emitted when client has connected to a server.

<a name="clientEventDisconnected"></a>

#### Event: 'disconnected'

- `context` [Client](#client)

Emitted when client has disconnected from a server.

<a name="clientEventProgress"></a>

#### Event: 'progress'

- `progress` [ITransferProgress](#)
- `info` [ITransferInfo](#)

Emitted when a chunk of a file has been sent to a server. You can access information like transfer speed or eta in `progress`. Basic file information, for example size and remote path in `info`.

```ts
const client = new Client();

client.on('progress', (progress, info) => {
  if (info.type === 'download') {
    console.log(
      `${info.remotePath} => ${info.localPath} - ${progress.eta} seconds left`,
    );
  }
});
```

<a name="clientAbort"></a>

#### client.abort()

- Returns: Promise&lt;void&gt;

Emits the `abort` event.
Then stops the current file transfer by reconnecting with a server, using the same config provided with the [client.connect()](#clientConnect).

<a name="clientConnect"></a>

#### client.connect(config)

- `config` [IConfig](#)
- Returns: Promise&lt;void&gt;

Chooses which library to use, depending on the `protocol` provided in the `config`. Connects with a server and then the `connected` event is fired.

<a name="clientConnected"></a>

#### client.connected

- Boolean

Indicates if client is connected to a server.

<a name="clientCreateBlank"></a>

#### client.createBlank(type, [, path][, files])

- `type` 'folder' | 'file'
- `path` String (optional)
- `files` [IFile[]](#) (optional)
- Returns: Promise&lt;string&gt;

Creates an empty file or folder at `path` with an unique name. If you don't provide the `files` arg, it will fetch automatically. Returns name of the file.

```ts
const client = new Client();
const name = await client.createBlank('file', '/documents');

console.log(`Name: ${name}`); // Name: new file
```

<a name="clientDelete"></a>

#### client.delete(path)

- `path` String
- Returns: Promise&lt;void&gt;

Removes any files and folders at `path`.

<a name="clientDisconnect"></a>

#### client.disconnect()

- Returns: Promise&lt;void&gt;

Aborts the current file transfer, if any. Then after client has disconnected from a server, the `disconnected` event is fired.

<a name="clientDownload"></a>

#### client.download(path, dest, [, options])

- `path` String
- `dest` [stream.Writable](https://nodejs.org/dist/latest-v13.x/docs/api/stream.html#stream_class_stream_writable)
- `options` [ITransferOptions](#) (optional)
- Returns: Promise&lt;[ITransferStatus](#)&gt;

Downloads a remote file. Pipes data into `dest`. When a new chunk of a file has been sent, the `progress` event is fired.
You can start at a given offset by setting `options`, which can be used to resume a transfer. Returns status of the transfer.

```ts
import { resolve } from 'path';

const client = new Client();

const remotePath = '/documents/new file.txt';
const localPath = resolve('downloads', 'new file.txt');

const status = await client.download(
  remotePath,
  createWriteStream(localPath, { flags: 'a' }),
  { startAt: 24000 }, // It will start at 24000 bytes
);

console.log(status); // finished
```

<a name="clientExists"></a>

#### client.exists(path)

- `path` String
- Returns: Promise&lt;boolean&gt;

Checks if file at `path` exists.

```ts
const client = new Client();
const exists = await client.exists('/documents/new file.txt');

console.log(exists ? 'does exists!' : "doesn't exists!");
```

<a name="clientMkdir"></a>

#### client.mkdir(path)

- `path` String
- Returns: Promise&lt;void&gt;

Creates a new folder at `path`.

<a name="clientMove"></a>

#### client.move(srcPath, destPath)

- `srcPath` String
- `destPath` String
- Returns: Promise&lt;void&gt;

Moves a file from `srcPath` to `destPath`. Can be used to rename a file.

<a name="clientPwd"></a>

#### client.pwd()

- Returns: Promise&lt;string&gt;

Returns path of the current working directory.

<a name="clientReadDir"></a>

#### client.readDir([, path])

- `path` String (optional)
- Returns: Promise&lt;[IFile[]](#)&gt;

Lists files and folders at `path`.

<a name="clientRimraf"></a>

#### client.rimraf(path)

- `path` string
- Returns: Promise&lt;void&gt;

Deletes any file and folder at `path`.

<a name="clientSend"></a>

#### client.send(command)

- `command` String
- Returns: Promise&lt;string&gt;

Sends a raw command to a server and returns the response.

<a name="clientSize"></a>

#### client.size(path)

- `path` String
- Returns: Promise&lt;number&gt;

Returns size of the file at `path` in bytes.

<a name="clientStat"></a>

#### client.stat(path)

- `path` String
- Returns: Promise&lt;[IStats](#)&gt;

Returns details about the file at `path`.

<a name="clientTouch"></a>

#### client.touch(path)

- `path` String
- Returns: Promise&lt;void&gt;

Creates an empty file at `path`.

<a name="clientUnlink"></a>

#### client.unlink(path)

- `path` String
- Returns: Promise&lt;void&gt;

Deletes a single file (not a folder) at `path`.

<a name="clientUpload"></a>

#### client.upload(path, source, [, options])

- `path` String
- `source` [stream.Readable](https://nodejs.org/dist/latest-v13.x/docs/api/stream.html#stream_class_stream_readable)
- `options` [ITransferOptions](#)
- Returns: Promise&lt;[ITransferStatus](#)&gt;

Uploads a local file. When a new chunk of a file has been sent, the `progress` event is fired.  Returns status of the transfer.

```ts
import { resolve } from 'path';

const client = new Client();

const localPath = resolve('uploads', 'new file.txt');
const remotePath = '/documents/new file.txt';

const status = await client.upload(remotePath, createReadStream(localPath));

console.log(status); // finished
```

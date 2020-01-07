# Qusly-Core documentation

## Table of contents

- [Client](#/docs/client.md)
  - [Introduction](#)
  - [API for Client](#client)
    - [Event: 'abort'](#clientEventAbort)
    - [Event: 'connected'](#clientEventConnected)
    - [Event: 'disconnected'](#clientEventDisconnected)
    - [Event: 'progress'](#clientEventProgress)
    - [client.\_ftpClient](#clientInternalFtp)
    - [client.\_sftpClient](#clientInternalSftp)
    - [client.\_tasks](#clientInternalTasks)
    - [client.\_transfer](#clientInternalTransfer)
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

<a name="clientEventAbort"></a>

#### Event: 'abort'

- `context` [&lt;Client&gt;](#client) an instance of the client

The `'abort'` event is emitted when the method [client.abort](#) is called and before any reconnection is done.

<a name="clientEventConnected"></a>

#### Event: 'connected'

- `context` [&lt;Client&gt;](#client) an instance of the client

The `'connected'` event is emitted when the client has connected to a server.

<a name="clientEventDisconnected"></a>

#### Event: 'disconnected'

- `context` [&lt;Client&gt;](#client) an instance of the client

The `'disconnected'` event is emitted when the client has closed all sockets, streams and disconnected from a server.

<a name="clientEventProgress"></a>

#### Event: 'progress'

- `progress` [&lt;ITransferProgress&gt;](#) an object with information about progress, for example `buffered` bytes
- `info` [&lt;ITransferInfo&gt;](#) an object with basic information about transfer, such as `type` and `path`

The 'progress' event is emitted when a chunk of a file has been sent to a server.

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

<a name="clientInternalFtp"></a>

#### client.\_ftpClient

The `'client._ftpClient'` is an instance of [basic-ftp `client`](https://github.com/patrickjuchli/basic-ftp/blob/master/src/Client.ts), which handles ftp connection.
Its an internal property and must not be set or called.

<a name="clientInternalSftp"></a>

#### client.\_sftpClient

The `'client._sftpClient'` is an instance of a [sftp client](https://github.com/qusly/qusly-core/blob/master/src/models/sftp-client.ts), which is an wrapper around [ssh2-streams `client`](https://github.com/mscdex/ssh2-streams/blob/master/lib/sftp.js), that handles sftp connection.
Its an internal property and must not be set or called.

<a name="clientInternalTasks"></a>

#### client.\_tasks

The `'client._tasks'` is an instance of a [task manager](https://github.com/qusly/qusly-core/blob/master/src/models/task-manager.ts), which handles the `client` methods asynchronously, even if they are called synchronously. This prevents ftp connection from crashing.
Its an internal property and must not be set or called.

<a name="clientInternalTransfer"></a>

#### client.\_transfer

The `'client._transfer'` is an instance of a [transfer manager](https://github.com/qusly/qusly-core/blob/master/src/models/transfer-manager.ts), which handles file transfer.
Its an internal property and must not be set or called.

<a name="clientAbort"></a>

#### client.abort()

- Returns: &lt;Promise&gt;

Stops the current file transfer, reconnects with a server using the same config provided with [client.connect()](#clientConnect).

<a name="clientConnect"></a>

#### client.connect(config)

- `config` [&lt;IConfig&gt;](#)
- Returns: &lt;Promise&gt;

Chooses which library to use, depending on the `protocol` provided in the `config`. Connects with a server and then, the `connected` event is fired.

<a name="clientConnected"></a>

#### client.connected

- &lt;bolean&gt;

Indicates if the client has connected to a server.

<a name="clientCreateBlank"></a>

#### client.createBlank(type, [, path][, files])

- type &lt;'folder'&gt; | &lt;'file'&gt;
- path &lt;string&gt; **Default:** ./
- files [&lt;IFile[]&gt;](#)
- Returns: &lt;Promise&gt; Name of the file.

Creates an empty file or folder, with an unique name in `path`. If you don't provide the `files` argument, it will fetch files automatically.

```ts
const client = new Client();
const name = await client.createBlank('file', '/documents');

console.log(name); // new file
```

<a name="clientDelete"></a>

#### client.delete(path)

- path &lt;string&gt;
- Returns: &lt;Promise&gt;

Removes any files and folders in `path`.

<a name="clientDisconnect"></a>

#### client.disconnect()

- Returns: &lt;Promise&gt;

Aborts active file transfer, closes opened sockets, streams and then disconnects from a server and then, the `disconnected` event is fired.

<a name="clientDownload"></a>

#### client.download(path, dest, [, options])

- path &lt;string&gt;
- dest [&lt;stream.Writable&gt;](https://nodejs.org/dist/latest-v13.x/docs/api/stream.html#stream_class_stream_writable)
- options [&lt;ITransferOptions&gt;](#)
- Returns: &lt;Promise&gt; Status of the transfer.

Downloads a remote file and and pipes it to the `dest`. Every time a new data chunk is sent, the `progress` event is triggered with proper info.
You can optionally start a transfer at given offset. This can be used to resume a transfer.

```ts
import { resolve } from 'path';

const client = new Client();

const remotePath = '/documents/new file.txt';
const localPath = resolve('downloads', 'new file.txt');

const status = await client.download(
  remotePath,
  createWriteStream(localPath, { flags: 'a' }),
  { startAt: 24000 },
);

console.log(status); // finished
```

<a name="clientExists"></a>

#### client.exists(path)

- path &lt;string&gt;
- Returns: &lt;Promise&gt; File exists or not.

Checks if a file at `path` exists.

```ts
const client = new Client();

const exists = await client.exists('/documents/new file.txt');

console.log(exists ? 'does exists!' : "doesn't exists!");
```

<a name="clientMkdir"></a>

#### client.mkdir(path)

- path &lt;string&gt;
- Returns: &lt;Promise&gt;

Creates a new folder at `path`.

<a name="clientMove"></a>

#### client.move(srcPath, destPath)

- srcPath &lt;string&gt;
- destPath &lt;string&gt;
- Returns: &lt;Promise&gt;

Moves a file from `srcPath` to `destPath`. Can be used to rename a file.

<a name="clientPwd"></a>

#### client.pwd()

- Returns: &lt;Promise&gt;

Returns path of the current working directory.

<a name="clientReadDir"></a>

#### client.readDir([, path])

- path &lt;string&gt; **Default:** ./
- Returns: &lt;Promise&gt;

Returns files and folders at `path`.

<a name="clientRimraf"></a>

#### client.rimraf(path)

- path &lt;string&gt;
- Returns: &lt;Promise&gt;

Deletes any file at `path` and all of its contents.

<a name="clientSend"></a>

#### client.send(command)

- command &lt;string&gt;
- Returns: &lt;Promise&gt; Server response.

Sends a raw command to a server. Output depends on the protocol and the support!

<a name="clientSize"></a>

#### client.size(path)

- path &lt;string&gt;
- Returns: &lt;Promise&gt;

Returns size of the file at `path` in bytes.

<a name="clientStat"></a>

#### client.stat(path)

- path &lt;string&gt;
- Returns: &lt;Promise&gt;

Returns details about the file at `path`, such as size and type.

<a name="clientTouch"></a>

#### client.touch(path)

- path &lt;string&gt;
- Returns: &lt;Promise&gt;

Creates an empty file at `path`.

<a name="clientUnlink"></a>

#### client.unlink(path)

- path &lt;string&gt;
- Returns: &lt;Promise&gt;

Deletes a file at `path`.

<a name="clientUpload"></a>

#### client.upload(path, source, [, options])

- path &lt;string&gt;
- source [&lt;stream.Readable&gt;](https://nodejs.org/dist/latest-v13.x/docs/api/stream.html#stream_class_stream_readable)
- options [&lt;ITransferOptions&gt;](#)
- Returns: &lt;Promise&gt; Status of the transfer.

Uploads a local file and and pipes it to the `source` at a server. Every time a new data chunk is sent, the `progress` event is triggered with proper info.

```ts
import { resolve } from 'path';

const client = new Client();

const localPath = resolve('uploads', 'new file.txt');
const remotePath = '/documents/new file.txt';

const status = await client.upload(remotePath, createReadStream(localPath));

console.log(status); // finished
```

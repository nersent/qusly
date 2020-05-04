# Qusly-Core documentation

## Table of contents

- [ConcurrentClient](#/docs/concurrent-concurrentClient.md)
  - [Event: 'abort'](#concurrentClientEventAbort)
  - [Event: 'abort-all'](#concurrentClientEventAbortAll)
  - [Event: 'connected'](#concurrentClientEventConnected)
  - [Event: 'disconnected'](#concurrentClientEventDisconnected)
  - [Event: 'finished'](#concurrentClientEventFinished)
  - [Event: 'new'](#concurrentClientEventNew)
  - [Event: 'progress'](#concurrentClientEventProgress)
  - [concurrentClient.abort(transferId)](#concurrentClientAbort)
  - [concurrentClient.abortAll()](#concurrentClientAbortAll)
  - [concurrentClient.connect(config, [, options])](#concurrentClientConnect)
  - [concurrentClient.constructor(maxClients, reserveClient)](#concurrentClientConstructor)
  - [concurrentClient.createBlank(type, [, path][, files])](#concurrentClientCreateBlank)
  - [concurrentClient.delete(path)](#concurrentClientDelete)
  - [concurrentClient.disconnect()](#concurrentClientDisconnect)
  - [concurrentClient.download(remotePath, localPath)](#concurrentClientDownload)
  - [concurrentClient.exists(path)](#concurrentClientExists)
  - [concurrentClient.mkdir(path)](#concurrentClientMkdir)
  - [concurrentClient.move(srcPath, destPath)](#concurrentClientMove)
  - [concurrentClient.pwd()](#concurrentClientPwd)
  - [concurrentClient.readDir([, path])](#concurrentClientReadDir)
  - [concurrentClient.rimraf(path)](#concurrentClientRimraf)
  - [concurrentClient.send(command)](#concurrentClientSend)
  - [concurrentClient.size(path)](#concurrentClientSize)
  - [concurrentClient.stat(path)](#concurrentClientStat)
  - [concurrentClient.touch(path)](#concurrentClientTouch)
  - [concurrentClient.unlink(path)](#concurrentClientUnlink)
  - [concurrentClient.upload(localPath, remotePath)](#concurrentClientUpload)

<a name="concurrentClient"></a>

### Class `ConcurrentClient`

An API, which provides access to FTP/FTPS/SFTP servers. The difference from a normal [Client](#/docs/client.md) is that it can use multiple [Client](#/docs/client.md#client) instances for faster file transfer. See [concurrentconcurrentClient.constructor](#concurrentClientConstructor) for more.

<a name="concurrentClientConstructor"></a>

### concurrentClient.constructor(maxClients, reserveClient)

- `maxClients` Number (optional) - **default: 1**
- `reserveClient` Boolean (optional) - **default: false**

ConcurrentClient assings one file per client. If you set `maxClients` to 4, it will transfer 4 times faster.

If the `reserveClient` is set to true, then one client is locked for only the basic api like listening files. The rest is used for transfer.
Otherwise each method is handled in the same queue as file transfer.

When `maxClients` equals 1, then `reserveClient` is disabled.

<a name="concurrentClientEventAbort"></a>

#### Event: 'abort'

Emitted when the [concurrentClient.abort()](#concurrentClientAbort) has been called and before any reconnection is requested.

<a name="concurrentClientEventAbortAll"></a>

#### Event: 'abort-all'

Emitted when the [concurrentClient.abortAll()](#concurrentClientAll) has been called and before any reconnection is requested.

<a name="concurrentClientEventConnected"></a>

#### Event: 'connected'

Emitted when each of the clients has connected to a server.

<a name="concurrentClientEventDisconnected"></a>

#### Event: 'disconnected'

Emitted when each of the clients has disconnected from a server.

<a name="concurrentClientEventFinished"></a>

#### Event: 'finished'

- `info` [IConcurrentTransferInfo](/docs/types.md#iConcurrentTransferInfo)

Emitted when a transfer has finished or has been aborted.

<a name="concurrentClientEventNew"></a>

#### Event: 'new'

- `info` [IConcurrentTransferInfo](/docs/types.md#iConcurrentTransferInfo)

Emitted when `concurrentClient.download` or `concurrentClient.upload` have been called.

<a name="concurrentClientEventProgress"></a>

#### Event: 'progress'

- `progress` [ITransferProgress](/docs/types.md#iTransferProgress)
- `info` [IConcurrentTransferInfo](/docs/types.mdiIConcurrentTransferInfo)

Emitted when a chunk of a file has been sent to a server. You can access information like transfer speed or eta in `progress`. Basic file information, for example size and remote path in `info`.

<a name="concurrentClientAbort"></a>

#### concurrentClient.abort(transferId)

- `transferId` String
- Returns: Promise&lt;void&gt;

Emits the `abort` event.
Then stops a specified with `transferId` file transfer. Reconnects to a server with the same config provided with [concurrentClient.connect()](#concurrentClientConnect).

<a name="concurrentClientAbortAll"></a>

#### concurrentClient.abortAll()

- Returns: Promise&lt;void&gt;

Emits the `abort-all` event.
Then stops every file transfer. Reconnects to a server with the same config provided with [concurrentClient.connect()](#concurrentClientConnect).

<a name="concurrentClientConnect"></a>

#### concurrentClient.connect(config, [, options])

- `config` [IConfig](/docs/types.md#iConfig)
- `options` [IOptions](#/docs/types.md#iOptions)
- Returns: Promise&lt;void&gt;

Connects each of the clients to a server and then the `connected` event is fired.

<a name="concurrentClientCreateBlank"></a>

#### concurrentClient.createBlank(type, [, path][, files])

- `type` 'folder' | 'file'
- `path` String (optional)
- `files` [IFile[]](/docs/types.md#iFile) (optional)
- Returns: Promise&lt;string&gt;

Creates an empty file or folder at `path` with an unique name. If you don't provide the `files` arg, it will fetch automatically. Returns name of the file.

<a name="concurrentClientDelete"></a>

#### concurrentClient.delete(path)

- `path` String
- Returns: Promise&lt;void&gt;

Removes any files and folders at `path`.

<a name="concurrentClientDisconnect"></a>

#### concurrentClient.disconnect()

- Returns: Promise&lt;void&gt;

Stops each of the clients from transfering a file. Disconnects every one of them and then the `disconnected` event is fired.

<a name="concurrentClientDownload"></a>

#### concurrentClient.download(remotePath, localPath)

- `remotePath` String
- `localPath` String
- Returns: Promise&lt;[ITransferStatus](/docs/types.md#iTransferStatus)&gt;

Downloads a remote file. When a new chunk of a file has been sent, the `progress` event is fired.

<a name="concurrentClientExists"></a>

#### concurrentClient.exists(path)

- `path` String
- Returns: Promise&lt;boolean&gt;

Checks if file at `path` exists.

<a name="concurrentClientMkdir"></a>

#### concurrentClient.mkdir(path)

- `path` String
- Returns: Promise&lt;void&gt;

Creates a new folder at `path`.

<a name="concurrentClientMove"></a>

#### concurrentClient.move(srcPath, destPath)

- `srcPath` String
- `destPath` String
- Returns: Promise&lt;void&gt;

Moves a file from `srcPath` to `destPath`. Can be used to rename a file.

<a name="concurrentClientPwd"></a>

#### concurrentClient.pwd()

- Returns: Promise&lt;string&gt;

Returns path of the current working directory.

<a name="concurrentClientReadDir"></a>

#### concurrentClient.readDir([, path])

- `path` String (optional)
- Returns: Promise&lt;[IFile[]](/docs/types.md#iFile)&gt;

Lists files and folders at `path`.

<a name="concurrentClientRimraf"></a>

#### concurrentClient.rimraf(path)

- `path` string
- Returns: Promise&lt;void&gt;

Deletes any file and folder at `path`.

<a name="concurrentClientSend"></a>

#### concurrentClient.send(command)

- `command` String
- Returns: Promise&lt;string&gt;

Sends a raw command to a server and returns the response.

<a name="concurrentClientSize"></a>

#### concurrentClient.size(path)

- `path` String
- Returns: Promise&lt;number&gt;

Returns size of the file at `path` in bytes.

<a name="concurrentClientStat"></a>

#### concurrentClient.stat(path)

- `path` String
- Returns: Promise&lt;[IStats](/docs/types.md#iStats)&gt;

Returns details about the file at `path`.

<a name="concurrentClientTouch"></a>

#### concurrentClient.touch(path)

- `path` String
- Returns: Promise&lt;void&gt;

Creates an empty file at `path`.

<a name="concurrentClientUnlink"></a>

#### concurrentClient.unlink(path)

- `path` String
- Returns: Promise&lt;void&gt;

Deletes a single file (not a folder) at `path`.

<a name="concurrentClientUpload"></a>

#### concurrentClient.upload(localPath, remotePath)

- `localPath` String
- `remotePath` String
- Returns: Promise&lt;[ITransferStatus](/docs/types.md#iTransferStatus)&gt;

Uploads a local file. When a new chunk of a file has been sent, the `progress` event is fired. Returns status of the transfer.

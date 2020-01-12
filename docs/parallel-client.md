# Qusly-Core documentation

## Table of contents

- [ParallelClient](#/docs/parallel-parallelClient.md)
  - [Event: 'abort'](#parallelClientEventAbort)
  - [Event: 'abort-all'](#parallelClientEventAbortAll)
  - [Event: 'connected'](#parallelClientEventConnected)
  - [Event: 'disconnected'](#parallelClientEventDisconnected)
  - [Event: 'finished'](#parallelClientEventFinished)
  - [Event: 'new'](#parallelClientEventNew)
  - [Event: 'progress'](#parallelClientEventProgress)
  - [parallelClient.abort(transferId)](#parallelClientAbort)
  - [parallelClient.abortAll()](#parallelClientAbortAll)
  - [parallelClient.config](#parallelClientInternalConfig)
  - [parallelClient.connect(config)](#parallelClientConnect)
  - [parallelClient.constructor(maxClients, reserveClient)](#parallelClientConstructor)
  - [parallelClient.createBlank(type, [, path][, files])](#parallelClientCreateBlank)
  - [parallelClient.delete(path)](#parallelClientDelete)
  - [parallelClient.disconnect()](#parallelClientDisconnect)
  - [parallelClient.download(remotePath, localPath)](#parallelClientDownload)
  - [parallelClient.exists(path)](#parallelClientExists)
  - [parallelClient.mkdir(path)](#parallelClientMkdir)
  - [parallelClient.move(srcPath, destPath)](#parallelClientMove)
  - [parallelClient.pwd()](#parallelClientPwd)
  - [parallelClient.readDir([, path])](#parallelClientReadDir)
  - [parallelClient.rimraf(path)](#parallelClientRimraf)
  - [parallelClient.send(command)](#parallelClientSend)
  - [parallelClient.size(path)](#parallelClientSize)
  - [parallelClient.stat(path)](#parallelClientStat)
  - [parallelClient.touch(path)](#parallelClientTouch)
  - [parallelClient.unlink(path)](#parallelClientUnlink)
  - [parallelClient.upload(localPath, remotePath)](#parallelClientUpload)

<a name="parallelClient"></a>

### Class `ParallelClient`

An API, which provides access to FTP/FTPS/SFTP servers. The difference from a normal [Client](#) is that it can use multiple [Client](#) instances for faster file transfer. See [parallelparallelClient.constructor](#parallelClientConstructor) for more.

<a name="parallelClientConstructor"></a>

### parallelClient.constructor(maxClients, reserveClient)

- `maxClients` Number (optional) - **default: 1**
- `reserveClient` Boolean (optional) - **default: false**

If you want to speed up a transfer, you can set `maxClients` to for example _4_. So when you transfer 40 files, it will finish 10 times faster. ParallelClient assigns one file per client.

If the `reserveClient` is set to true, then one client is locked only for the basic api like listening files. The rest is used for transfer.
Otherwise each method is handled in the same queue as file transfer.

When `maxClients` equals 1, then `reserveClient` is disabled.

<a name="parallelClientEventAbort"></a>

#### Event: 'abort'

Emitted when the [parallelClient.abort()](#) has been called and before any reconnection is requested.

<a name="parallelClientEventAbortAll"></a>

#### Event: 'abort-all'

Emitted when the [parallelClient.abortAll()](#) has been called and before any reconnection is requested.

<a name="parallelClientEventConnected"></a>

#### Event: 'connected'

Emitted when each of the clients has connected to a server.

<a name="parallelClientEventDisconnected"></a>

#### Event: 'disconnected'

Emitted when each of the clients has disconnected from a server.

<a name="parallelClientEventFinished"></a>

#### Event: 'finished'

- `info` [IParallelTransferInfo](#)

Emitted when a transfer has finished or has been aborted.

<a name="parallelClientEventNew"></a>

#### Event: 'new'

- `info` [IParallelTransferInfo](#)

Emitted when `parallelClient.download` or `parallelClient.upload` have been called.

<a name="parallelClientEventProgress"></a>

#### Event: 'progress'

- `progress` [ITransferProgress](#)
- `info` [IParallelTransferInfo](#)

Emitted when a chunk of a file has been sent to a server. You can access information like transfer speed or eta in `progress`. Basic file information, for example size and remote path in `info`.

<a name="parallelClientAbort"></a>

#### parallelClient.abort(transferId)

- `transferId` String
- Returns: Promise&lt;void&gt;

Emits the `abort` event.
Then stops a specified with `transferId` file transfer. Reconnects to a server with the same config provided with [parallelClient.connect()](#parallelClientConnect).

<a name="parallelClientAbortAll"></a>

#### parallelClient.abortAll()

- Returns: Promise&lt;void&gt;

Emits the `abort-all` event.
Then stops each of the clients from transfering a file. Reconnects to a server with the same config provided with [parallelClient.connect()](#parallelClientConnect).

<a name="parallelClientConnect"></a>

#### parallelClient.connect(config)

- `config` [IConfig](#)
- Returns: Promise&lt;void&gt;

Connects each of the clients to a server and then the `connected` event is fired.

<a name="parallelClientCreateBlank"></a>

#### parallelClient.createBlank(type, [, path][, files])

- `type` 'folder' | 'file'
- `path` String (optional)
- `files` [IFile[]](#) (optional)
- Returns: Promise&lt;string&gt;

Creates an empty file or folder at `path` with an unique name. If you don't provide the `files` arg, it will fetch automatically. Returns name of the file.

<a name="parallelClientDelete"></a>

#### parallelClient.delete(path)

- `path` String
- Returns: Promise&lt;void&gt;

Removes any files and folders at `path`.

<a name="parallelClientDisconnect"></a>

#### parallelClient.disconnect()

- Returns: Promise&lt;void&gt;

Stops each of the clients from transfering a file. Disconnects every one of them and then the `disconnected` event is fired.

<a name="parallelClientDownload"></a>

#### parallelClient.download(remotePath, localPath)

- `remotePath` String
- `localPath` String
- Returns: Promise&lt;[ITransferStatus](#)&gt;

Downloads a remote file. When a new chunk of a file has been sent, the `progress` event is fired.

<a name="parallelClientExists"></a>

#### parallelClient.exists(path)

- `path` String
- Returns: Promise&lt;boolean&gt;

Checks if file at `path` exists.

<a name="parallelClientMkdir"></a>

#### parallelClient.mkdir(path)

- `path` String
- Returns: Promise&lt;void&gt;

Creates a new folder at `path`.

<a name="parallelClientMove"></a>

#### parallelClient.move(srcPath, destPath)

- `srcPath` String
- `destPath` String
- Returns: Promise&lt;void&gt;

Moves a file from `srcPath` to `destPath`. Can be used to rename a file.

<a name="parallelClientPwd"></a>

#### parallelClient.pwd()

- Returns: Promise&lt;string&gt;

Returns path of the current working directory.

<a name="parallelClientReadDir"></a>

#### parallelClient.readDir([, path])

- `path` String (optional)
- Returns: Promise&lt;[IFile[]](#)&gt;

Lists files and folders at `path`.

<a name="parallelClientRimraf"></a>

#### parallelClient.rimraf(path)

- `path` string
- Returns: Promise&lt;void&gt;

Deletes any file and folder at `path`.

<a name="parallelClientSend"></a>

#### parallelClient.send(command)

- `command` String
- Returns: Promise&lt;string&gt;

Sends a raw command to a server and returns the response.

<a name="parallelClientSize"></a>

#### parallelClient.size(path)

- `path` String
- Returns: Promise&lt;number&gt;

Returns size of the file at `path` in bytes.

<a name="parallelClientStat"></a>

#### parallelClient.stat(path)

- `path` String
- Returns: Promise&lt;[IStats](#)&gt;

Returns details about the file at `path`.

<a name="parallelClientTouch"></a>

#### parallelClient.touch(path)

- `path` String
- Returns: Promise&lt;void&gt;

Creates an empty file at `path`.

<a name="parallelClientUnlink"></a>

#### parallelClient.unlink(path)

- `path` String
- Returns: Promise&lt;void&gt;

Deletes a single file (not a folder) at `path`.

<a name="parallelClientUpload"></a>

#### parallelClient.upload(localPath, remotePath)

- `localPath` String
- `remotePath` String
- Returns: Promise&lt;[ITransferStatus](#)&gt;

Uploads a local file. When a new chunk of a file has been sent, the `progress` event is fired. Returns status of the transfer.

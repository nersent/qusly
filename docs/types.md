# Qusly-Core documentation

## Table of contents

- [Types and interfaces](#)
  - [IConfig](#iConfig)
  - [IFilePermissions](#iFilePermissions)
  - [IFileType](#iFileType)
  - [IFile](#iFile)
  - [IParallelTransferInfo](#iParallelTransferInfo)
  - [IParallelTransferStatus](#iParallelTransferStatus)
  - [IProtocol](#iProtocol)
  - [IStats](#iStats)
  - [ITransferInfo](#iTransferInfo)
  - [ITransferOptions](#iTransferOptions)
  - [ITransferProgress](#iTransferProgress)
  - [ITransferStatus](#iTransferStatus)
  - [ITransferType](#iTransferType)

<a name="iConfig"></a>

### Interface `IConfig`

- `protocol` [IProtocol](#iProtocol)
- `host` String
- `user` String
- `password` String
- `port` Number (optional)

<a name="iFilePermissions"></a>

### Interface `IFilePermissions`

- `user` Number (optional)
- `group` Number (optional)

<a name="iFileType"></a>

### Type `IFileType`

- 'file' | 'folder' | 'unknown' | 'symbolic-link'

<a name="iFile"></a>

### Interface `IFile`

- `name` String (optional)
- `type` [IFileType](#iFileType) (optional)
- `size` Number (optional)
- `user` String (optional)
- `group` String (optional)
- `date` Date (optional)
- `ext` String (optional)
- `permissions` [IFilePermissions](#iFilePermissions) (optional)

<a name="iParallelTransferInfo"></a>

### Interface `IParallelTransferInfo`

- `id` String - Unique id of a transfer
- `localPath` String
- `remotePath` String
- `status` [IParallelTransferStatus](#iParallelTransferStatus)
- `type` [ITransferType](#iTransferType)

<a name="iParallelTransferStatus"></a>

### Type `IParallelTransferStatus`

- 'pending' | 'transfering' | [ITransferStatus](#iTransferStatus)

<a name="iProtocol"></a>

### Type `IProtocol`

- 'ftp' | 'ftps' | 'sftp'

<a name="iStats"></a>

### Interface `IStats`

- `size` Number (optional)
- `type` [IFileType](#iFileType) (optional)

<a name="iTransferInfo"></a>

### Interface `ITransferInfo`

- `type` [ITransferType](#iTransferType)
- `localPath` String
- `remotePath` String
- `startAt` Date - When a transfer has stared
- `context` [Client](#)

<a name="iTransferOptions"></a>

### Interface `ITransferOptions`

- `quiet` Boolean (optional) - Blocks the [`progress`](#) event from emitting
- `startAt` Number (optional) - Offset of a file

<a name="iTransferProgress"></a>

### Interface `ITransferProgress`

- `buffered` Number
- `eta` Number - estimated time arrival in seconds
- `speed` Number - speed rate in KB/s
- `percent` Number
- `size` Number - size of a transfered file

<a name="iTransferStatus"></a>

### Type `ITransferStatus`

- 'finished' | 'aborted' | 'closed'

### Type `ITransferType`

- 'download' | 'upload'

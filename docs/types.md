# Qusly-Core documentation

## Table of contents

- [Types and interfaces](#)
  - [IConfig](#iConfig)
  - [IOptions](#iOptions)
  - [ISftpOptions](#iSftpOptions)
  - [IFtpOptions](#iFtpOptions)
  - [IFtpsOptions](#iFtpsOptions)
  - [IFilePermissions](#iFilePermissions)
  - [IFileType](#iFileType)
  - [IFile](#iFile)
  - [IConcurrentTransferInfo](#iConcurrentTransferInfo)
  - [IConcurrentTransferStatus](#iConcurrentTransferStatus)
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

<a name="iOptions"></a>

### Interface `IOptions`

- `sftp` [ISftpOptions](#iSftpOptions)
- `ftp` [IFtpOptions](#iFtpOptions)
- `ftps` [IFtpsOptions](#iFtpsOptions)

<a name="iSftpOptions"></a>

### Interface `ISftpOptions`

- `tryKeyboard` Boolean

<a name="iFtpOptions"></a>

### Interface `IFtpOptions`

<a name="iFtpsOptions"></a>

### Interface `IFtpsOptions`

- `secureOptions` [ConnectionOptions](#https://nodejs.org/api/tls.html#tls_tls_connect_options_callback)

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

<a name="iConcurrentTransferInfo"></a>

### Interface `IConcurrentTransferInfo`

- `id` String - Unique id of a transfer
- `localPath` String
- `remotePath` String
- `status` [IConcurrentTransferStatus](#iConcurrentTransferStatus)
- `type` [ITransferType](#iTransferType)

<a name="iConcurrentTransferStatus"></a>

### Type `IConcurrentTransferStatus`

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

export {
  IProtocol,
  IClientOptions,
  IConfig,
  IFtpConfig,
  ISFtpConfig,
  IFile,
  IFilePermissions,
  IFileType,
  ITransfer,
  ITransferDirection,
  ITransferProgress,
  ITransferProgressListener,
  ITransferInfo,
  ITransferOptions,
} from './interfaces';

export { Client } from './client';
export { Strategy } from './strategies/strategy';
export { FtpStrategy } from './strategies/ftp';
export { SftpStrategy } from './strategies/sftp';

export { execFunction } from './utils/function';

export * as Tasks from './task-manager';

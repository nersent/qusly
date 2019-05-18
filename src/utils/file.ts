import { FileInfo } from "basic-ftp";
import { extname } from 'path';

import { File } from "../models/file";

export const formatFile = ({ name, type, size, user, group, date, permissions }: FileInfo): File => ({
  date: new Date(date),
  permissions: {
    user: permissions.user,
    group: permissions.group,
  },
  type,
  name,
  size,
  user,
  group,
  ext: extname(name)
})

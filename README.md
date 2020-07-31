<div align="center">
  <img src="static/logo.png" width="256">

  <h1>Qusly-Core</h1>

  <br />

[![Travis](https://img.shields.io/travis/qusly/qusly-core.svg?style=flat-square)](https://travis-ci.org/qusly/qusly-core)
[![NPM](https://img.shields.io/npm/v/qusly-core.svg?style=flat-square)](https://www.npmjs.com/package/qusly-core)
[![NPM](https://img.shields.io/npm/dm/qusly-core?style=flat-square)](https://www.npmjs.com/package/qusly-core)
[![Codecov](https://img.shields.io/codecov/c/github/qusly/qusly-core)](https://codecov.io/gh/qusly/qusly-core)
[![Discord](https://discordapp.com/api/guilds/307605794680209409/widget.png?style=shield)](https://discord.gg/P7Vn4VX)
[![Github](https://img.shields.io/github/followers/xnerhu.svg?style=social&label=Follow)](https://github.com/xnerhu)

</div>

Qusly-Core is a powerful multi-protocol library for file transfer. Created for [Qusly](https://github.com/qusly/qusly).

# Features

- Supports **FTP, FTPS, SFTP**
- [API that allows to call methods asynchronously](#tasksQueue)
- Informative transfer progress info - e.g. eta, speed in B/s
- [Connection pool](#connectionPool)
- Ability to register custom protocols

# Example

```js
import { Client } from 'qusly-core';

async function main() {
  const client = new Client({ pool: 2 });

  await client.connect({
    protocol: 'ftp',
    host: 'www.example.com',
    user: 'root',
    password: 'password',
  });

  // It will handle all methods at once.
  const [documents, videos] = await Promise.all([
    client.list('/documents'),
    client.list('/videos'),
  ]);

  console.log(document, videos);

  await client.disconnect();
}

main();
```

# Installation

```bash
$ npm install qusly-core
```

# [Documentation](https://wexond.net/public/qusly/core/docs/index.html)

# [Roadmap](https://github.com/qusly/qusly-core/projects)

# Components

We use [ssh2](https://github.com/mscdex/ssh2) and [basic-ftp](https://github.com/patrickjuchli/basic-ftp) under the hood.

<a name="tasksQueue"></a>

# Task queue

Certain protocols such as `ftp` don\'t support handling many request at the same time. When app calls API many times from many places, handling manually these cases is very hard - you can't use `await` in the most cases.

What if you want to use many connections to speed up transfering files?

That's where we come in. This library supports it all thanks to the powerful [task manager](https://github.com/qusly/qusly-core/blob/master/src/tasks.ts).

<a name="connectionPool"></a>

# Connection pool

<!-- This library allows you to use all connections from pool for every method or one connection for generic methods e.g. listing files -->

Allows you to:

- Use all connections for every method
- Use one connection to generic methods e.g. listing files and the rest for transfering files

<a href="https://www.patreon.com/bePatron?u=21429620">
  <img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="160">
</a>

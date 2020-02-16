<div align="center">
  <img src="static/logo.png" width="256">

  <h1>Qusly-Core</h1>

  <br />

[![Travis](https://img.shields.io/travis/qusly/qusly-core.svg?style=flat-square)](https://travis-ci.org/qusly/qusly-core)
[![NPM](https://img.shields.io/npm/v/qusly-core.svg?style=flat-square)](https://www.npmjs.com/package/qusly-core)
[![NPM](https://img.shields.io/npm/dm/qusly-core?style=flat-square)](https://www.npmjs.com/package/qusly-core)
[![Discord](https://discordapp.com/api/guilds/307605794680209409/widget.png?style=shield)](https://discord.gg/P7Vn4VX)
[![Github](https://img.shields.io/github/followers/xnerhu.svg?style=social&label=Follow)](https://github.com/xnerhu)

</div>

Qusly-Core is an **FTP/FTPS/SFTP** client, built around [ssh2](https://github.com/mscdex/ssh2) and [basic-ftp](https://github.com/patrickjuchli/basic-ftp). It was built for **[Qusly](https://www.github.com/qusly/qusly)** - _an elegant desktop client_.

### Features

- Supports **FTP, FTPS and SFTP**
- Modern, promise based API
- Informative progress event, which includes **eta** and **speed rate**
- Client for **concurrent** file transfer

## Installation

```bash
$ npm install qusly-core
```

## Example

Listing files:

```js
import { Client } from 'qusly-core';

async function init() {
  const client = new Client();

  await client.connect({
    host: 'www.example.com',
    user: 'root',
    password: 'password',
    protocol: 'sftp',
  });

  const files = await client.readDir('/documents');

  console.log(files);

  await client.disconnect();
}

init();
```

Output:

```js
[
  {
    name: 'logs.txt',
    type: 'file',
    ext: '.txt',
    size: 43,
    user: 'root',
    group: 'root',
    date: '2019-05-29T22:00:00.000Z',
    permissions: {
      user: 6,
      group: 6,
    },
  },
];
```

## Table of contents

- [Client](/docs/client.md)
- [Examples](/examples)
- [ConcurrentClient](/docs/concurrent-client.md)
- [Types](/docs/types.md)

<a href="https://www.patreon.com/bePatron?u=21429620">
  <img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="160">
</a>

# Proxy.rpc

## Install

```$xslt
npm i --save proxy.rpc 
```

## Run

```
#ctrl.js#
module.exports = {
  a() {return new Promise()},
  b: {
    c() {return new Promise()}
  }
}
```

```
#index.js#
const ctrl = require('./ctrl');
require('proxy.rpc').run(ctrl, process.env.SERVICE_PORT);
```

## Connection at remote service

```
const remoteService = require('proxy.rpc').at(process.env.REMOTE_SERVICE_URL);
await remoteService.a();
await remoteService.b.c();
``` 

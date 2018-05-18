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
require('proxy.rpc').run(ctrl, {
  username: process.env.SERVICE_USERNAME,   // optional
  password: process.env.SERVICE_PASSWORD,   // optional
  port: process.env.SERVICE_PORT            // optional, default 8080
});
```

## Connection at remote service

```
const remoteService = require('proxy.rpc').at(process.env.REMOTE_SERVICE_URL);
await remoteService.a();
await remoteService.b.c();
``` 

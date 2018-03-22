# Proxy.rpc

## Install

```$xslt
npm i --save proxy.rpc 
```

## Run

```
const ctrl = require('./ctrl');
require('proxy.rpc').run(ctrl, process.env.SERVICE_PORT);
```

## Connection at remote service

```
const remoteService = require('proxy.rpc').at(process.env.REMOTE_SERVICE_URL);
``` 

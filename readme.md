# Proxy.rpc

## Install

```$xslt
npm i --save proxy.rpc 
```

## Run

```
#ctrl.js#
module.exports = {
   a() {
       
   },
   b: {
     c(x, y) {
       return x + y
     }
   },
   d: {
     e: {
       f({x, y}) {
         return x * y
       }
     }
   }
 };
```

```
#index.js#
const ctrl = require('./ctrl');
let serverPromise = require('proxy.rpc').run(ctrl, {
  username: process.env.SERVICE_USERNAME,   // optional
  password: process.env.SERVICE_PASSWORD,   // optional
  port: process.env.SERVICE_PORT            // optional, default 8080
  logger: {info, error}                     // optional
  ctx: <String>                             // optional for logger context
});
//if need to stop
serverPromise.then(s => s.close())
```

## Connection at remote service

```
REMOTE_SERVICE_URL should be represented as 
http[s]://[username:password@]host[:port]
```

```
const remoteService = require('proxy.rpc').at(REMOTE_SERVICE_URL, {logger, ctx});  
await remoteService.a();
await remoteService.b.c(1, 2);
await remoteService.d.e.f({x:1, y:2});
``` 


## Raw RPC request/response examples 
```
_Request_
{ path: 'a',
  data: [] }
  
_Response_
{__result: 'ok'} //if method returns undefined, proxy returns 'ok' 
```
```
_Request_
{ path: 'b.c', // OR ['b', 'c']
  data: [ 1, 2 ] }
  
_Response_
{__result: 3}
```
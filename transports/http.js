const request = require('superagent');
const micro = require('micro');
const {json, send} = micro;
const cls = require('cls-hooked');
const uuid = require('uuid');
const _ = require('lodash');

const {RpcError} = require('../errors');

const SESSION_ID = 'x-session-id';

function getBasicAuthCredentials(req) {
  let authHeader = req.headers['authorization'];

  if (!authHeader) {
    return null;
  }

  let authData = authHeader.split(' ');

  if (authData.length !== 2 || authData[0].toLowerCase() !== 'basic') {
    return null;
  }

  let decodedAuth = new Buffer(authData[1], 'base64').toString();
  let credentials = decodedAuth.split(':');

  if (credentials.length !== 2) {
    return null;
  }

  return credentials;
}

module.exports = {

  client: async (target, path, data, {ctx, logger}) => {
    let req = request.post(target);

    if (ctx) {
      let sesId = _.invoke(cls.getNamespace(ctx.ns), 'get', ctx.sessionId);
      req.set(SESSION_ID, sesId || uuid());
    }

    let response = await req.send({path, data});

    if (typeof response.body.__result !== 'undefined') {
      return response.body.__result;
    }

    return response.body;
  },

  server: async (process, {username, password, port = 8080, ctx, logger, endpoints = {}}) => {
    let requestNs = cls.getNamespace(ctx.ns);

    if (!requestNs) {
      requestNs = cls.createNamespace(ctx.ns);
    }

    let server = micro(async (req, res) => {
      let context = requestNs.createContext();
      requestNs.enter(context);

      try {
        if (username && password) {
          let credentials = getBasicAuthCredentials(req);

          if (!credentials || credentials[0] !== username || credentials[1] !== password) {
            throw new RpcError({
              message: 'Authentication required',
              status: 401,
            });
          }
        }

        requestNs.set(ctx.sessionId, req.headers[SESSION_ID] || uuid.v4());

        const fn = endpoints[req.url];

        if (fn) {
          logger.info('proxy.rpc.in', {
            method: req.method,
            url: req.url
          });

          try {
            await fn(req, res);
          } catch (e) {
            e.method = req.method;
            e.url = req.url;

            logger.error(e);

            throw e;
          }

          return;
        }

        const body = await json(req, {limit: '50mb'});
        const {path, data} = body;

        logger.info('proxy.rpc.in', {
          path: Array.isArray(path) ? path.join('.') : path,
          data: JSON.stringify(data)
        });

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        send(res, 200, await process(path, data));
      } catch (err) {
        let {message, details = {}, code = 500, trace} = err;

        if (err.status) {
          code = err.status;
        }

        send(res, code, JSON.stringify({message, details, trace}));
      } finally {
        requestNs.set(ctx.sessionId, null);
        requestNs.exit(context);
      }
    });

    await new Promise((resolve, reject) => server.listen(port, err => err ? reject(err) : resolve()));

    logger.info(`Service started at port ${port}...`);

    return server;
  }
};

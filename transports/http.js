const request = require('superagent');
const micro = require('micro');
const {json, send} = micro;
const cls = require('cls-hooked');
const uuid = require('uuid');
const _ = require('lodash');

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

  client: async (target, path, data, {headers = {}, ctx}) => {
    let req = request.post(target);

    if (ctx) {
      let sesId = _.invoke(cls.getNamespace(ctx.ns), 'get', ctx.attr);
      if (sesId) req.set(SESSION_ID, sesId);
    }

    _.forEach(headers, (v, k) => req.set(k, v()));

    let response = await req.send({path, data});
    if (typeof response.body.__result !== 'undefined') {
      return response.body.__result;
    }
    return response.body;
  },

  server: async (process, {username, password, port = 8080, ctx, logger}) => {
    cls.createNamespace(ctx.ns);
    let server = micro(async (req, res) => {
      let requestNs = cls.getNamespace(ctx.ns);
      let context = requestNs.createContext();
      requestNs.enter(context);

      try {
        if (username && password) {
          let credentials = getBasicAuthCredentials(req);
          if (!credentials || credentials[0] !== username || credentials[1] !== password) {
            send(res, 401, 'Authentication required');
            return;
          }
        }

        requestNs.set(ctx.attr, req.headers[SESSION_ID] || uuid.v4());

        let body = await json(req, {limit: '50mb'});
        let {path, data} = body;

        logger.info('proxy.rpc in', {path: Array.isArray(path) ? path.join('.') : path, data: JSON.stringify(data)});

        try {
          send(res, 200, await process(path, data));
        } catch (e) {
          logger.error(e);
          let {message, code = 500} = e;
          send(res, code, message);
        }
      } finally {
        requestNs.set(ctx.attr, null);
        requestNs.exit(context);
      }
    });
    await new Promise((resolve, reject) => server.listen(port, err => err ? reject(err) : resolve()));
    logger.info(`Service started at port ${port}...`);

    return server
  }
};

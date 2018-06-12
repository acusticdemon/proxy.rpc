'use strict';

const request = require('superagent');
const micro = require('micro');
const {json, sendError, send} = micro;
const cls = require('cls-hooked');
const uuid = require('uuid');

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

  client: async (target, path, data) => {
    let response = await request.post(target).send({path, data});
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

        let info = {
          requestId: uuid.v4()
        };
        requestNs.set(ctx.attr, info);

        let {path, data} = await json(req, {limit: '50mb'});
        logger.info(path, data);
        try {
          send(res, 200, await process(path, data));
        } catch (e) {
          let {message, code = 500} = e;
          logger.error('rpc-service', e);
          send(res, code, message);
        }
      } finally {
        requestNs.exit(context);
      }
    });
    await new Promise((resolve, reject) => server.listen(port, err => err ? reject(err) : resolve()));
    logger.info(`Service started at port ${port}...`);
  }
};

'use strict';

const request = require('superagent');
const micro = require('micro');
const {json, sendError, send} = micro;

module.exports = {

  client: async (target, path, data) => {
    let response = await request.post(target).send({path, data});
    if (typeof response.body.__result !== 'undefined') {
      return response.body.__result;
    }
    return response.body;
  },

  server: async (process, {username, password, port = 8080}) => {
    let server = micro(async (req, res) => {
      if (username && password) {
        let authHeader = req.headers['authorization'];
        let authData = authHeader.split(' ');
        let decodedAuth = new Buffer(authData[1], 'base64').toString();
        let credentials = decodedAuth.split(':');
        if (credentials[0] !== username || credentials[1] !== password) {
          send(res, 401, 'Authentication required');
          return;
        }
      }
      let {path, data} = await json(req, {limit: '50mb'});
      console.log(path, data);
      try {
        send(res, 200, await process(path, data));
      } catch (e) {
        let {message, code = 500} = e;
        console.error('rpc-service', e);
        send(res, code, message);
      }
    });
    await new Promise((resolve, reject) => server.listen(port, err => err ? reject(err) : resolve()));
    console.log(`Service started at port ${port}...`);
  }
};

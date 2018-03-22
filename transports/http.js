'use strict';

const request = require('superagent');
const micro = require('micro');
const {json, sendError, send} = micro;

module.exports = {

  client: async (target, ns, method, data) => {
    let response = await request.post(target).send({ns, method, data});
    if (typeof response.body.__result !== 'undefined') {
      return response.body.__result;
    }
    return response.body;
  },

  server: async (process, {port = 8080}) => {
    let server = micro(async (req, res) => {
      let {ns, method, data} = await json(req, {limit: '50mb'});
      console.log(ns, method, data);
      try {
        send(res, 200, await process(ns, method, data));
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

const http = require('./transports/http');
const hasIn = require('lodash/hasIn');
const invoke = require('lodash/invoke');

module.exports = {
  async run(controller, config) {
    if (typeof config === 'number' || typeof config === 'string') {
      config = {port: config};
    }
    if (!config.ctx) {
      config.ctx = {
        ns: 'proxy.rpc',
        attr: 'info'
      }
    }
    if (!config.logger) {
      config.logger = {
        info: (...args) => console.log(...args),
        error: (...args) => console.error(...args)
      }
    }

    return http.server(async (path, data) => {
      let result;

      if (!hasIn(controller, path)) {
        let e = new Error('Not Found');
        e.status = e.code = 404;
        throw e;
      }

      result = await invoke(controller, path, ...data);

      if (typeof result === 'undefined') result = {__result: 'ok'};
      if (typeof result !== 'object' || result === null) result = {__result: result};

      return result;
    }, config);
  },

  at(addr, {headers = {}, ctx ={}}) {
    return make_proxy();

    function make_proxy(obj = () => {
    }) {

      return new Proxy(obj, {
        get(target, property) {
          let fn = () => {
          };
          fn.__path = (target.__path || []).concat(property);
          return make_proxy(fn);
        },

        async apply(target, self, args) {
          try {
            return await http.client(addr, target.__path, args, {headers, ctx});
          } catch (e) {
            if (e.response) {
              let err = new Error();
              err.message = e.response.text;
              err.code = e.response.status;
              throw err;
            }

            throw e;
          }
        }
      });
    }
  }
};

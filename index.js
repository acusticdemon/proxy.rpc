const http = require('./transports/http');
const RpcError = require('./errors/RpcError');
const hasIn = require('lodash/hasIn');
const invoke = require('lodash/invoke');

module.exports = {
  RpcError,

  async run(controller, config) {
    if (typeof config === 'number' || typeof config === 'string') {
      config = {port: config};
    }
    if (!config.ctx) {
      config.ctx = {
        ns: 'proxy.rpc',
        sessionId: 'session-id'
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

      try {
        result = await invoke(controller, path, ...data);

        if (typeof result === 'undefined') result = {__result: 'ok'};
        if (typeof result !== 'object' || result === null) result = {__result: result};

        return result;
      } catch (e) {
        e.path = path;
        e.data = JSON.stringify(data);
        config.logger.error(e);
        throw e;
      }
    }, config);
  },

  at(addr, options = {}) {
    if (!options.logger) {
      options.logger = {
        info: (...args) => console.log(...args),
        error: (...args) => console.error(...args)
      }
    }

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
          let startTime = new Date();
          let path = Array.isArray(target.__path) ? target.__path.join('.') : target.__path;
          try {
            let res = await http.client(addr, target.__path, args, options);
            let ms = new Date() - startTime;
            options.logger.info(`proxy.rpc.request`, {path, ms, data: JSON.stringify(args)});
            return res;
          } catch (e) {
            if (e.response) {
              let err = RpcError.fromHttpResponse(e.response);
              err.message = `proxy.rpc.error in path ${addr}:/${path} ${err.message}`;
              err.path = path;
              err.data = JSON.stringify(args);
              err.ms = new Date() - startTime;
              options.logger.error(err);
              throw err;
            }

            throw e;
          }
        }
      });
    }
  }
};

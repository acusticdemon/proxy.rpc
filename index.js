const _ = require('lodash');

const {RpcError} = require('./errors');
const http = require('./transports/http');
const {fastJSONParse} = require('./helpers/json');

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
      };
    }

    if (!config.logger) {
      config.logger = {
        info: (...args) => console.log(...args),
        error: (...args) => console.error(...args)
      };
    }

    return http.server(async (path, data) => {
      let result;

      if (!_.hasIn(controller, path)) {
        let e = new Error('Not Found');
        e.status = e.code = 404;
        throw e;
      }

      try {
        result = await _.invoke(controller, path, ...data);

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
      };
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
          } catch (err) {
            const {response} = err;

            if (!response) {
              throw err;
            }

            const {status, text} = response;
            const {message, details, trace = []} = fastJSONParse(text, {
              message: text,
              details: {},
            });

            const error = new RpcError({
              ms: new Date() - startTime,
              data: JSON.stringify(args),
              trace: [
                `${addr}/${path}`,
                ...trace,
              ],
              details,
              message,
              status,
            });

            options.logger.error(error.toJSON());

            throw error;
          }
        }
      });
    }
  }
};

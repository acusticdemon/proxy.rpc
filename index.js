const _ = require('lodash');
const {Histogram} = require('prom-client');

const {RpcError} = require('./errors');
const http = require('./transports/http');
const {fastJSONParse} = require('./helpers/json');

module.exports = {
  RpcError,

  async run(controller, config) {
    config = _.clone(config);

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

    let rpcRequestsHistogram;

    if (config.prometheus && config.prometheus.register) {
      const {register} = config.prometheus;

      rpcRequestsHistogram = new Histogram({
        name: 'rpc_requests_ms',
        help: 'RPC requests (ms)',
        labelNames: ['path', 'status'],
        buckets: [10, 50, 150, 500, 1000, 5000],
        registers: [register]
      });

      if (!_.has(config, ['endpoints', '/metrics'])) {
        _.set(config, ['endpoints', '/metrics'], async (req, res) => {
          const metrics = await register.metrics();

          res.setHeader('Content-Type', register.contentType);
          res.end(metrics);
        });
      }
    }

    _.set(config, ['endpoints', '/healthz'], (req, res) => {
      res.end('ok');
    });

    return http.server(async (path, data) => {
      const start = Date.now();
      const pathString = path.join('.');

      if (!_.hasIn(controller, path)) {
        let e = new Error('Not Found');

        e.status = e.code = 404;

        if (rpcRequestsHistogram) {
          rpcRequestsHistogram
            .labels(pathString, e.status)
            .observe(Date.now() - start);
        }

        throw e;
      }

      try {
        let result = await _.invoke(controller, path, ...data);

        if (typeof result === 'undefined') result = {__result: 'ok'};
        if (typeof result !== 'object' || result === null) result = {__result: result};

        if (rpcRequestsHistogram) {
          rpcRequestsHistogram
            .labels(pathString, 200)
            .observe(Date.now() - start);
        }

        return result;
      } catch (e) {
        e.path = path;
        e.data = JSON.stringify(data);

        config.logger.error(e);

        if (rpcRequestsHistogram) {
          rpcRequestsHistogram
            .labels(pathString, e.code || e.status || 500)
            .observe(Date.now() - start);
        }

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

            const error = new RpcError({
              ms: new Date() - startTime,
              data: JSON.stringify(args),
              trace: [`${addr}/${path}`],
              message: err.message
            });

            if (response) {
              const {status, text} = response;

              const {message, details, trace = []} = fastJSONParse(text, {
                message: text,
                details: {},
              });

              Object.assign(error, {
                details,
                message,
                status
              });

              error.trace.push(...trace);
            }

            options.logger.error(error);

            throw error;
          }
        }
      });
    }
  }
};

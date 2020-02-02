const _ = require("lodash");

const { RpcError } = require("./errors");
const http = require("./transports/http");
const { fastJSONParse } = require("./helpers/json");

const defaultLogger = {
  info: (...args) => console.log(...args),
  error: (...args) => console.error(...args)
};

function readConfiguration(options) {
  const ctx = _.defaults({}, _.get(options, "ctx"), {
    ns: "proxy.rpc",
    accountId: "accountId",
    sessionId: "sessionId"
  });

  return _.defaults({ ctx }, options, { logger: defaultLogger });
}

function makeProxy(obj, addr, route, config) {
  return new Proxy(_.noop, {
    get(target, property) {
      return makeProxy(obj, addr, route.concat(property), config);
    },
    async apply(target, self, args) {
      let { logger } = config;
      let startTime = new Date();
      let data = JSON.stringify(args);
      let path = Array.isArray(route) ? route.join(".") : route;

      try {
        let res = await http.client(addr, route, args, config);
        let ms = new Date() - startTime;

        logger.info(`proxy.rpc.request`, { path, data, ms });

        return res;
      } catch (err) {
        const { response } = err;

        if (!response) {
          throw err;
        }

        const { status, text } = response;
        const { message, details, trace = [] } = fastJSONParse(text, {
          message: text,
          details: {}
        });

        const error = new RpcError({
          ms: new Date() - startTime,
          data,
          trace: [`${addr}/${path}`, ...trace],
          details,
          message,
          status
        });

        logger.error(error.toJSON());

        throw error;
      }
    }
  });
}

async function run(controller, options) {
  if (_.isNumber(options) || _.isString(options)) {
    options = { port: options };
  }

  const config = readConfiguration(options);
  const { logger } = config;

  return http.server(async (path, data) => {
    let result;

    if (!_.hasIn(controller, path)) {
      throw new RpcError({
        message: "Not Found",
        status: 404
      });
    }

    try {
      result = await _.invoke(controller, path, ...data);

      if (_.isUndefined(result)) {
        result = { __result: "ok" };
      }

      if (!_.isObject(result) || _.isNull(result)) {
        result = { __result: result };
      }

      return result;
    } catch (error) {
      error.path = path;
      error.data = JSON.stringify(data);
      logger.error(error);
      throw error;
    }
  }, config);
}

function at(addr, options) {
  return makeProxy(_.noop, addr, [], readConfiguration(options));
}

module.exports = {
  RpcError,
  run,
  at
};

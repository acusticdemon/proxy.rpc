const http = require('./transports/http');
const invoke = require('lodash/invoke');

module.exports = {
  async run(controller, config) {
    if (typeof config === 'number' || typeof config === 'string') {
      config = {port: config};
    }

    return await http.server(async (path, data) => {
      let result;

      result = await invoke(controller, path, ...data);

      if (typeof result === 'undefined') result = {__result: 'ok'};
      if (typeof result !== 'object' || result === null) result = {__result: result};

      return result;
    }, config);
  },

  at(addr) {
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
            return await http.client(addr, target.__path, args);
          } catch (e) {
            throw e.response ? new Error(e.response) : e;
          }
        }
      });
    }
  }
};

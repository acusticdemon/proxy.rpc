'use strict';

const ROOT = '__root';
const http = require('./transports/http');

module.exports = {
  async run(controller, config) {
    if (typeof config === 'number' || typeof config === 'string') {
      config = {port: config};
    }

    return await http.server(async (ns, method, data) => {
      let result;

      if (ns === ROOT) {
        result = await controller[method](...data);
      } else {
        result = await controller[ns][method](...data);
      }

      if (typeof result === 'undefined') result = { __result: 'ok' };
      if (typeof result !== 'object' || result === null) result = { __result: result };

      return result;
    }, config);
  },

  at(addr) {
    return make_proxy();

    function make_proxy(obj = () => {}) {

      return new Proxy(obj, {
        get(target, property) {
          let fn = () => {};
          fn.__path = (target.__path || []).concat(property);
          return make_proxy(fn);
        },

        async apply(target, self, args) {
          let [ns, method] = target.__path;
          if (!method) {
            method = ns;
            ns = ROOT;
          }
          try {
            return await http.client(addr, ns, method, args);
          } catch (e) {
            throw e.response ? new Error(e.response.text) : e;
          }
        }
      });
    }
  }
};

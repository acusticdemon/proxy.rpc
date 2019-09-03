const ProxyRpc = require('../../index');

const INIT_MSG = 'init';

async function runAsync (...args) {
  await ProxyRpc.run(...args);

  if (process.send) {
    process.send(INIT_MSG);
  }
}

module.exports = {
    INIT_MSG,
    runAsync,
};

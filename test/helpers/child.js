const child_process = require('child_process');

const {INIT_MSG} = require('./rpc');

async function forkAsync(path, options) {
  return new Promise((resolve, reject) => {
    const child = child_process.fork(path, [], options);

    child.on('message', (message) => {
      if (message === INIT_MSG) {
        resolve(child);
      }
    });
  });
}

module.exports = {
  forkAsync,
};

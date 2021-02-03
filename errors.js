class RpcError extends Error {
  constructor({ message = 'RpcError', ...options }) {
    super(message);

    this.name = 'RpcError';
    this.code = 'proxy.rpc.error';

    this.ms = options.ms;
    this.data = options.data;
    this.trace = options.trace;
    this.details = options.details;
    this.status = options.status;
  }
}

module.exports = {
  RpcError,
};
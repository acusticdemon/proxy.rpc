class RpcError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }

  static fromHttpResponse(response) {
    let err;
    try {
      err = JSON.parse(response.text);
    } catch (e) {
      err = {
        message: response.text,
        details: {}
      }
    }
    return new RpcError(response.status, err.message, err.details);
  }
}

module.exports = RpcError;

const request = require("superagent");
const micro = require("micro");
const { json, send } = micro;
const cls = require("cls-hooked");
const uuid = require("uuid");
const _ = require("lodash");

const { RpcError } = require("../errors");

const ACCOUNT_ID_HEADER = "x-account-id";
const SESSION_ID_HEADER = "x-session-id";

function getBasicAuthCredentials(req) {
  let authHeader = req.headers["authorization"];

  if (!authHeader) {
    return null;
  }

  let authData = authHeader.split(" ");

  if (authData.length !== 2 || authData[0].toLowerCase() !== "basic") {
    return null;
  }

  let decodedAuth = new Buffer(authData[1], "base64").toString();
  let credentials = decodedAuth.split(":");

  if (credentials.length !== 2) {
    return null;
  }

  return credentials;
}

module.exports = {
  client: async (target, path, data, { ctx, logger }) => {
    let req = request.post(target);

    if (ctx) {
      const ns = cls.getNamespace(ctx.ns);
      const accountId = _.invoke(ns, "get", ctx.accountId);
      const sessionId = _.invoke(ns, "get", ctx.sessionId);

      if (accountId) {
        req.set(ACCOUNT_ID_HEADER, accountId);
      }

      req.set(SESSION_ID_HEADER, sessionId || uuid());
    }

    const { body } = await req.send({ path, data });
    const response = _.get(body, "__result", body);

    return response;
  },

  server: async (handler, { username, password, port = 8080, ctx, logger }) => {
    let requestNs = cls.getNamespace(ctx.ns);

    if (!requestNs) {
      requestNs = cls.createNamespace(ctx.ns);
    }

    let server = micro(async (req, res) => {
      let context = requestNs.createContext();
      requestNs.enter(context);

      try {
        if (username && password) {
          let credentials = getBasicAuthCredentials(req);

          if (
            !credentials ||
            credentials[0] !== username ||
            credentials[1] !== password
          ) {
            throw new RpcError({
              message: "Authentication required",
              status: 401
            });
          }
        }

        const {
          [ACCOUNT_ID_HEADER]: accountId,
          [SESSION_ID_HEADER]: sessionId
        } = req.headers;

        requestNs.set(ctx.accountId, accountId);
        requestNs.set(ctx.sessionId, sessionId || uuid.v4());

        let body = await json(req, { limit: "50mb" });
        let { path, data } = body;

        logger.info("proxy.rpc.in", {
          path: Array.isArray(path) ? path.join(".") : path,
          data: JSON.stringify(data)
        });

        send(res, 200, await handler(path, data));
      } catch (err) {
        let { message, details = {}, code = 500, trace } = err;

        if (err.status) {
          code = err.status;
        }

        send(res, code, JSON.stringify({ message, details, trace }));
      } finally {
        requestNs.set(ctx.sessionId, null);
        requestNs.set(ctx.accountId, null);
        requestNs.exit(context);
      }
    });

    await new Promise((resolve, reject) =>
      server.listen(port, err => (err ? reject(err) : resolve()))
    );

    logger.info(`Service started at port ${port}...`);

    return server;
  }
};

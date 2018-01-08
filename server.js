"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Koa = require("koa");
const KoaBodyParser = require("koa-bodyparser");
const KoaJson = require("koa-json");
const KoaPassport = require("koa-passport");
const KoaRouter = require("koa-router");
const KoaSession = require("koa-session");
const KoaStatic = require("koa-static");
const KoaWebpack = require("koa-webpack");
const Moment = require("moment");
const api_1 = require("./api");
const auth_1 = require("./auth");
const util_1 = require("./util");
const logger = new util_1.Logger(util_1.LogSource.Server);
process.on("uncaughtException", (err) => {
    logger.error("Fatal error, process exiting");
    logger.error(err);
    // do a graceful shutdown,
    // close the database connection etc.
    process.exit(1);
});
const dev = process.env.NODE_ENV === "development";
const apiOnly = 2 in process.argv && process.argv[2] === "-api-only";
if (apiOnly)
    logger.info("Running in API Only mode.");
const server = new Koa();
const router = new KoaRouter();
server.keys = ["<\xd2Oa\x9f\xfa\xe2\xc6\xdad \xcf\x18=\xf5h.\xff\xb2\xd3\x02M.vI\x9eN\xe7'\xa6\xc8I\xd62J\xbe"];
// server.use(async (ctx, next) =>
//            {
//                try
//                {
//                    await next();
//                }
//                catch (err)
//                {
//                    ctx.status = err.status || 500;
//                    ctx.body = err.message;
//                    ctx.app.emit("error", err, ctx);
//                }
//            });
server.use(KoaBodyParser());
server.use(KoaJson());
server.use(KoaSession({ httpOnly: true }, server));
server.use(KoaPassport.initialize());
server.use(KoaPassport.session());
router.use("/api", api_1.ApiRouter.routes());
router.use("/auth", auth_1.AuthRouter.routes());
router.use("*", async (ctx, next) => {
    ctx.status = 404;
    await next();
});
const config = require(`../rain-library-client/webpack.${dev ? "dev" : "prod"}`);
server.use(async (ctx, next) => {
    logger.log(`${Moment().format("YYYY.MM.DD hh:mm:ssaZ")} - ${ctx.req.method} ${ctx.req.url}`);
    await next();
});
if (dev && !apiOnly) {
    const webpackLog = new util_1.Logger(util_1.LogSource.Webpack);
    const compiler = require("webpack")(config);
    webpackLog.log("Loaded configuration.");
    const middleware = KoaWebpack({
        compiler,
        dev: {
            publicPath: "/",
            noInfo: true,
            stats: {
                colors: true
            }
        },
        hot: {
            log: webpackLog.log.bind(webpackLog),
            path: "/__webpack_hmr",
            heartbeat: 1000
        }
    });
    server.use(middleware);
    webpackLog.info("Attached middleware.");
}
server.use(router.routes());
server.use(KoaStatic(config.output.path));
server.listen(process.env.PORT || 8000);
logger.info("Server is up and running.");
//# sourceMappingURL=server.js.map
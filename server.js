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
const api_1 = require("./api");
const auth_1 = require("./auth");
const util_1 = require("./util");
const logger = new util_1.Logger(util_1.LogSource.Server);
process.on("uncaughtException", (err) => {
    logger.err("Fatal error, process exiting");
    logger.err(err);
    // do a graceful shutdown,
    // close the database connection etc.
    process.exit(1);
});
const dev = process.env.NODE_ENV === "development";
const server = new Koa();
const router = new KoaRouter();
router.use(KoaSession(server));
router.use(KoaBodyParser());
router.use(KoaJson());
router.use(KoaPassport.initialize());
router.use(KoaPassport.session());
router.use("/api", api_1.ApiRouter.routes());
router.use("/auth", auth_1.AuthRouter.routes());
router.use("*", async (ctx, next) => {
    ctx.status = 404;
    await next();
});
server.use(async (ctx, next) => {
    logger.log(`${new Date().toISOString()} - ${ctx.req.method} ${ctx.req.url}`);
    await next();
});
const config = require(`../rain-library-client/webpack.${dev ? "dev" : "prod"}`);
if (dev) {
    const compiler = require("webpack")(config);
    const webpackLog = new util_1.Logger(util_1.LogSource.Webpack);
    server.use(KoaWebpack({
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
    }));
}
server.keys = ["<\xd2Oa\x9f\xfa\xe2\xc6\xdad \xcf\x18=\xf5h.\xff\xb2\xd3\x02M.vI\x9eN\xe7'\xa6\xc8I\xd62J\xbe"];
server.use(KoaStatic(config.output.path));
server.use(router.routes());
server.listen(process.env.PORT || 8000);
logger.info("Server is up and running.");
//# sourceMappingURL=server.js.map
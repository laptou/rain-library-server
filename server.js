"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const http2 = require("http2");
const Koa = require("koa");
const KoaBodyParser = require("koa-bodyparser");
const KoaJson = require("koa-json");
const KoaPassport = require("koa-passport");
const KoaRouter = require("koa-router");
const KoaSendFile = require("koa-sendfile");
const KoaSession = require("koa-session");
const KoaStatic = require("koa-static");
const Moment = require("moment");
const path = require("path");
const api_1 = require("./api");
const auth_1 = require("./auth");
const util_1 = require("./util");
const logger = new util_1.Logger(util_1.LogSource.Server);
process.on("uncaughtException", err => {
    logger.error("Fatal error, process exiting");
    logger.error(err);
    // do a graceful shutdown,
    // close the database connection etc.
    process.exit(1);
});
const dev = process.env.NODE_ENV === "development" &&
    process.argv.indexOf("-production") === -1;
const apiOnly = process.argv.indexOf("-api-only") !== -1;
if (apiOnly)
    logger.info("Running in API Only mode.");
if (dev)
    logger.info("Running in development mode.");
const app = new Koa();
const router = new KoaRouter();
app.keys = [
    "<\xd2Oa\x9f\xfa\xe2\xc6\xdad \xcf\x18=\xf5h.\xff\xb2\xd3\x02M.vI\x9eN\xe7'\xa6\xc8I\xd62J\xbe"
];
app.use(async (ctx, next) => {
    try {
        await next();
    }
    catch (err) {
        ctx.status = err.status || 500;
        ctx.body = err.message;
        ctx.app.emit("error", err, ctx);
    }
});
app.use(KoaBodyParser());
app.use(KoaJson());
app.use(KoaSession({}, app));
app.use(KoaPassport.initialize());
app.use(KoaPassport.session());
router.use("/api", api_1.ApiRouter.routes());
router.use("/auth", auth_1.AuthRouter.routes());
app.use(async (ctx, next) => {
    logger.log(`${Moment().format("YYYY.MM.DD hh:mm:ssaZ")} - ${ctx.req.method} ${ctx.req.url}`);
    await next();
});
const config = require("../client/config");
logger.log("Config: " + JSON.stringify(config));
if (!apiOnly) {
    logger.log("Not running in API Only mode.");
    if (!dev) {
        logger.log("Configuring catch-all router.");
        router.get("*", async (ctx) => {
            const target = path.join(config.output, ctx.path);
            const f = file => fs.existsSync(file) && fs.statSync(file).isFile();
            if (ctx.path) {
                if (f(target + ".gz")) {
                    await KoaSendFile(ctx, target + ".gz");
                    ctx.set("Content-Encoding", "gzip");
                    ctx.type = path.extname(target);
                }
                else if (f(target)) {
                    await KoaSendFile(ctx, target);
                }
                else {
                    await KoaSendFile(ctx, path.join(config.output, "index.html"));
                }
            }
        });
    }
    else {
        const KoaWebpack = require("koa-webpack");
        const webpackLog = new util_1.Logger(util_1.LogSource.Webpack);
        const compiler = require("webpack")(require(`../client/webpack.${dev ? "dev" : "prod"}`));
        webpackLog.log("Loaded configuration.");
        const middleware = KoaWebpack({
            compiler,
            dev: {
                publicPath: "/",
                log: webpackLog.log.bind(webpackLog),
                warn: webpackLog.log.bind(webpackLog),
                error: webpackLog.log.bind(webpackLog),
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
        const mfs = middleware.dev.fileSystem;
        router.get("*", async (ctx) => {
            ctx.body = await new Promise(async (resolve, reject) => {
                await mfs.readFile(path.join(config.output, "index.html"), "utf8", (err, result) => (err ? reject(err) : resolve(result)));
            });
        });
        app.use(middleware);
        webpackLog.info("Attached webpack middleware.");
    }
}
app.use(router.routes());
app.use(KoaStatic(config.output));
if (dev) {
    const server = http2
        .createSecureServer({
        key: fs.readFileSync("key/server.key"),
        cert: fs.readFileSync("key/server.crt")
    }, app.callback())
        .listen(process.env.PORT || 8000);
}
else {
    app.listen(process.env.PORT || 8000);
}
logger.info("Server is up and running.");
//# sourceMappingURL=server.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
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
    !process.argv.includes("-production");
const serverConfig = require("./config");
const flags = serverConfig.flags;
const switches = {
    api_only: "api-only",
    http2: "http2",
    ssl: "ssl",
    ssl_redirect: "ssl-redirect"
};
for (const sw in switches) {
    if (!switches.hasOwnProperty(sw))
        continue;
    if (process.argv.includes("-" + switches[sw]))
        flags[sw] = true;
    if (process.argv.includes("-no-" + switches[sw]))
        flags[sw] = false;
}
if (flags.api_only)
    logger.info("Running in API Only mode.");
if (flags.ssl)
    logger.info("Running with SSL mode.");
else
    logger.info("Not running with SSL mode.");
if (flags.ssl_redirect)
    logger.info("Running with HTTPS redirect.");
else
    logger.info("Not running with HTTPS redirect.");
if (flags.http2)
    logger.info("Running in HTTP2 mode.");
else
    logger.info("Not running in HTTP2 mode.");
if (dev)
    logger.info("Running in development mode.");
else
    logger.info("Running in production mode.");
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
        // ctx.app.emit("error", err, ctx);
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
    logger.log(`${Moment().format("YYYY.MM.DD hh:mm:ssaZ")} - ${ctx.req.method} ${ctx.req.url} - HTTP ${ctx.req.httpVersion} - ${ctx.req.connection.remoteAddress}`);
    if (flags.ssl_redirect && ctx.href.match(/^http\:\/\//)) {
        logger.log(`Redirecting from ${ctx.href}`);
        if (dev || ctx.href.includes("localhost"))
            ctx.redirect(ctx.href.replace(/^http\:\/\/localhost:8000/, "https://localhost:8001"));
        else
            ctx.redirect(ctx.href.replace(/^http\:\/\//, "https://"));
    }
    else
        await next();
});
const clientConfig = require("../client/config");
if (!flags.api_only) {
    if (!dev) {
        logger.log("Configuring catch-all router.");
        router.get("*", async (ctx) => {
            const target = path.join(clientConfig.output, ctx.path);
            const f = file => fs.existsSync(file) && fs.statSync(file).isFile();
            logger.log(`\tCatch all router hit: ${target}`);
            if (ctx.path) {
                if (f(target + ".gz")) {
                    logger.log(`\tServing gzipped file: ${target}.gz`);
                    await KoaSendFile(ctx, target + ".gz");
                    ctx.set("Content-Encoding", "gzip");
                    ctx.type = path.extname(target);
                }
                else if (f(target)) {
                    logger.log(`\tServing file: ${target}`);
                    await KoaSendFile(ctx, target);
                }
                else {
                    logger.log(`\tServing index: ${target}`);
                    await KoaSendFile(ctx, path.join(clientConfig.output, "index.html"));
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
                warn: webpackLog.warn.bind(webpackLog),
                error: webpackLog.error.bind(webpackLog),
                noInfo: true,
                stats: {
                    colors: true
                }
            },
            hot: {
                log: webpackLog.info.bind(webpackLog),
                path: "/__webpack_hmr",
                heartbeat: 1000
            }
        });
        const mfs = middleware.dev.fileSystem;
        router.get("*", async (ctx) => {
            ctx.body = await new Promise(async (resolve, reject) => {
                await mfs.readFile(path.join(clientConfig.output, "index.html"), "utf8", (err, result) => (err ? reject(err) : resolve(result)));
            });
        });
        app.use(middleware);
        webpackLog.info("Attached webpack middleware.");
    }
}
app.use(router.routes());
app.use(KoaStatic(clientConfig.output));
let http = require("http").createServer;
let https = require("https").createServer;
if (flags.http2) {
    http = require("http2").createServer;
    https = http.createSecureServer;
}
if (flags.ssl) {
    https({
        pfx: fs.readFileSync(path.resolve(__dirname, "key/server.pfx")),
        passphrase: "password"
    }, app.callback()).listen(8001);
}
http(app.callback()).listen(process.env.PORT || 8000);
logger.info("Server is up and running.");
//# sourceMappingURL=server.js.map
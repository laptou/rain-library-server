import * as Koa from "koa";
import * as KoaBodyParser from "koa-bodyparser";
import * as KoaJson from "koa-json";
import * as KoaPassport from "koa-passport";
import * as KoaRouter from "koa-router";
import * as KoaSendFile from "koa-sendfile";
import * as KoaSession from "koa-session";
import * as KoaStatic from "koa-static";

import * as Moment from "moment";
import * as path from "path";
import * as fs from "fs";

import { ApiRouter } from "./api";
import { AuthRouter } from "./auth";
import { Logger, LogSource } from "./util";

const logger = new Logger(LogSource.Server);

process.on("uncaughtException", (err) =>
{
    logger.error("Fatal error, process exiting");
    logger.error(err);

    // do a graceful shutdown,
    // close the database connection etc.
    process.exit(1);
});

const dev = process.env.NODE_ENV === "development";
const apiOnly = 2 in process.argv && process.argv[2] === "-api-only";

if (apiOnly) logger.info("Running in API Only mode.");

const server = new Koa();
const router = new KoaRouter();

server.keys = ["<\xd2Oa\x9f\xfa\xe2\xc6\xdad \xcf\x18=\xf5h.\xff\xb2\xd3\x02M.vI\x9eN\xe7'\xa6\xc8I\xd62J\xbe"];

server.use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (err)
    {
        ctx.status = err.status || 500;
        ctx.body = err.message;
        ctx.app.emit("error", err, ctx);
    }
});

server.use(KoaBodyParser());
server.use(KoaJson());

server.use(KoaSession({}, server));

server.use(KoaPassport.initialize());
server.use(KoaPassport.session());



router.use("/api", ApiRouter.routes());
router.use("/auth", AuthRouter.routes());

server.use(async (ctx, next) =>
{
    logger.log(`${Moment().format("YYYY.MM.DD hh:mm:ssaZ")} - ${ctx.req.method} ${ctx.req.url}`);
    await next();
});

const config = require("../client/config");

logger.log("Config: " + JSON.stringify(config));

if (!apiOnly)
{
    logger.log("Not running in API Only mode.");

    if (!dev)
    {
        logger.log("Configuring catch-all router.");

        router.get("*", async ctx =>
        {
            const target = path.join(config.output, ctx.path);

            if (ctx.path && fs.existsSync(target) && fs.statSync(target).isFile())
                await KoaSendFile(ctx, target);
            else
                await KoaSendFile(ctx, path.join(config.output, "index.html"));
        });

    }
    else
    {
        const KoaWebpack = require("koa-webpack");
        const webpackLog = new Logger(LogSource.Webpack);
        const compiler = require("webpack")(require(`../client/webpack.${dev ? "dev" : "prod"}`));
        webpackLog.log("Loaded configuration.");

        const middleware = KoaWebpack(
            {
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

        router.get("*", async ctx =>
        {
            ctx.body = await new Promise(
                async (resolve, reject) =>
                {
                    await mfs.readFile(path.join(config.output, "index.html"),
                        "utf8",
                        (err, result) => err ? reject(err) : resolve(result));
                });
        });

        server.use(middleware);

        webpackLog.info("Attached webpack middleware.");
    }
}

server.use(router.routes());
server.use(KoaStatic(config.output));

server.listen(process.env.PORT || 8000);
logger.info("Server is up and running.");

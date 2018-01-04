import * as Koa from "koa";
import * as KoaBodyParser from "koa-bodyparser";
import * as KoaJson from "koa-json";
import * as KoaPassport from "koa-passport";
import * as KoaRouter from "koa-router";
import * as KoaSession from "koa-session";
import * as KoaStatic from "koa-static";
import * as KoaWebpack from "koa-webpack";

import { ApiRouter } from "./api";
import { AuthRouter } from "./auth";
import { Logger, LogSource } from "./util";

const logger = new Logger(LogSource.Server);

process.on("uncaughtException", (err) =>
{
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

router.use("/api", ApiRouter.routes());
router.use("/auth", AuthRouter.routes());
router.use("*", async (ctx, next) =>
{
    ctx.status = 404;
    await next();
});

server.use(async (ctx, next) =>
           {
               logger.log(`${new Date().toISOString()} - ${ctx.req.method} ${ctx.req.url}`);
               await next();
           });

const config = require(`../rain-library-client/webpack.${dev ? "dev" : "prod"}`);

if (dev)
{
    const compiler = require("webpack")(config);
    const webpackLog = new Logger(LogSource.Webpack);
    server.use(KoaWebpack(
        {
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
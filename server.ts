import * as Koa from "koa";
import * as Router from "koa-router";
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

let router = new Router();
router.use(require("koa-bodyparser")());
router.use(require("koa-json")());
router.use("/api", ApiRouter.routes());
router.use("/auth", AuthRouter.routes());
router.use("*", async (ctx, next) =>
{
    ctx.status = 404;
    await next();
});

const server = new Koa();



server.use(async (ctx, next) =>
           {
               logger.log(`${new Date().toISOString()} - ${ctx.req.method} ${ctx.req.url}`);
               await next();
           });

const config = require(`../rain-library-client/webpack.${dev ? "dev" : "prod"}`);

if (dev)
{
    const compiler = require("webpack")(config);
    
    server.use(require("koa-webpack")(
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
                log: new Logger(LogSource.Webpack).log,
                path: "/__webpack_hmr",
                heartbeat: 1000
            }
        }));
}

server.use(require("koa-static")(config.output.path));
server.use(router.routes());

server.listen(process.env.PORT || 8000);
logger.info("Server is up and running.");
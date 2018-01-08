import * as Koa from "koa";
import * as KoaBodyParser from "koa-bodyparser";
import * as KoaJson from "koa-json";
import * as KoaPassport from "koa-passport";
import * as KoaRouter from "koa-router";
import * as KoaSession from "koa-session";
import * as KoaStatic from "koa-static";
import * as KoaWebpack from "koa-webpack";
import * as Moment from "moment";

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

router.use("/api", ApiRouter.routes());
router.use("/auth", AuthRouter.routes());
router.use("*", async (ctx, next) =>
{
    ctx.status = 404;
    await next();
});

const config = require(`../rain-library-client/webpack.${dev ? "dev" : "prod"}`);

server.use(async (ctx, next) =>
           {
               logger.log(`${Moment().format("YYYY.MM.DD hh:mm:ssaZ")} - ${ctx.req.method} ${ctx.req.url}`);
               await next();
           });

if (dev && !apiOnly)
{
    const webpackLog = new Logger(LogSource.Webpack);
    const compiler = require("webpack")(config);
    webpackLog.log("Loaded configuration.");
    
    const middleware = KoaWebpack(
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
        });
    
    server.use(middleware);
    
    webpackLog.info("Attached middleware.");
}

server.use(router.routes());
server.use(KoaStatic(config.output.path));

server.listen(process.env.PORT || 8000);
logger.info("Server is up and running.");
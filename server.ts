import chalk from "chalk";
import * as Koa from "koa";
import * as Router from "koa-router";

const dev = process.env.NODE_ENV === "development";

let router = new Router();
router.use(require("koa-bodyparser")());
router.use(require("koa-json")());
router.use("/api", require("./api").routes());
router.use("*", async (ctx, next) =>
{
    ctx.status = 404;
    await next();
});

let server = new Koa();

let serverLogger = {
    webpackLog: function log (info, ... params)
    {
        if (dev)
            console.info(chalk.grey.bold("[WEBPACK] ") + chalk.grey(info), ... params);
        else console.info(info, ... params);
    },
    log: function log (info, ... params)
    {
        if (dev)
            console.info(chalk.blue.bold("[SERVER] ") + chalk.blue(info), ... params);
        else console.info(info, ... params);
        
    },
    info: function log (info, ... params)
    {
        if (dev)
            console.info(chalk.cyan.bold("[SERVER] ") + chalk.cyan(info), ... params);
        else console.info(info, ... params);
        
    },
    error: function err (info, ... params)
    {
        if (dev)
            console.error(chalk.cyan.bold("[SERVER] ") + chalk.red(info), ... params);
        else console.info(info, ... params);
        
    }
};

process.on("uncaughtException", (err) =>
{
    serverLogger.error("Fatal error, process exiting");
    serverLogger.error(err);
    
    // do a graceful shutdown,
    // close the database connection etc.
    process.exit(1);
});

server.use(async (ctx, next) =>
           {
               serverLogger.log(`${new Date().toISOString()} - ${ctx.req.method} ${ctx.req.url}`);
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
                log: serverLogger.webpackLog,
                path: "/__webpack_hmr",
                heartbeat: 1000
            }
        }));
}

server.use(require("koa-static")(config.output.path));
server.use(router.routes());

server.listen(process.env.PORT || 8000);
serverLogger.info("Server is up and running.");
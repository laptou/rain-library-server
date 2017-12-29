import chalk from "chalk";
import * as Koa from "koa";
import * as Router from "koa-router";

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

process.on("uncaughtException", (err) =>
{
    console.log("whoops! There was an uncaught error", err);
    // do a graceful shutdown,
    // close the database connection etc.
    process.exit(1);
});

server.use(async (ctx, next) =>
           {
               console.log(chalk.dim.cyan(`${new Date().toISOString()} - ${ctx.req.method} ${ctx.req.url}`));
               await next();
           });

const dev = process.env.NODE_ENV === "development";
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
                log: (a, ... b) => console.log(chalk.grey(a), ... b),
                path: "/__webpack_hmr",
                heartbeat: 1000
            }
        }));
}

server.use(require("koa-static")(config.output.path));
server.use(router.routes());

server.listen(process.env.PORT || 8000);
console.info("Server is up and running.");
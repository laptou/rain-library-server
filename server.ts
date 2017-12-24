import * as Koa from "koa";
import * as Router from "koa-router";

let path = require("path");


let router = new Router();
router.use(require("koa-bodyparser")());
router.use(require("koa-json")());
router.use("/api", require("./api").routes());
router.use("*", (ctx, next) => {
    ctx.status = 404;
    next();
});

let server = new Koa();

const config = require("../client/webpack.config");
const compiler = require("webpack")(config);

process.on('uncaughtException', (err) => {
    console.log('whoops! There was an uncaught error', err);
    // do a graceful shutdown,
    // close the database connection etc.
    process.exit(1);
});

server.use(async (ctx, next) =>
           {
               console.log("%s - %s %s", new Date().toISOString(), ctx.req.method, ctx.req.url);
               await next();
           });

server.use(require("koa-webpack")({
    compiler,
    dev: {
        publicPath: "/",
        noInfo: true,
        stats: {
            colors: true
        }
    },
    hot: {
        log: console.log,
        path: "/__webpack_hmr",
        heartbeat: 10 * 1000
    }
}));
server.use(router.routes());
server.use(require("koa-static")(path.join(__dirname, "../client/dist")));


server.listen(8000);
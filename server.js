"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const Koa = require("koa");
const Router = require("koa-router");
const dev = process.env.NODE_ENV === "development";
let router = new Router();
router.use(require("koa-bodyparser")());
router.use(require("koa-json")());
router.use("/api", require("./api").routes());
router.use("*", (ctx, next) => __awaiter(this, void 0, void 0, function* () {
    ctx.status = 404;
    yield next();
}));
let server = new Koa();
let serverLogger = {
    webpackLog: function log(info, ...params) {
        if (dev)
            console.info(chalk_1.default.grey.bold("[WEBPACK] ") + chalk_1.default.grey(info), ...params);
        else
            console.info(info, ...params);
    },
    log: function log(info, ...params) {
        if (dev)
            console.info(chalk_1.default.blue.bold("[SERVER] ") + chalk_1.default.blue(info), ...params);
        else
            console.info(info, ...params);
    },
    info: function log(info, ...params) {
        if (dev)
            console.info(chalk_1.default.cyan.bold("[SERVER] ") + chalk_1.default.cyan(info), ...params);
        else
            console.info(info, ...params);
    },
    error: function err(info, ...params) {
        if (dev)
            console.error(chalk_1.default.cyan.bold("[SERVER] ") + chalk_1.default.red(info), ...params);
        else
            console.info(info, ...params);
    }
};
process.on("uncaughtException", (err) => {
    serverLogger.error("Fatal error, process exiting");
    serverLogger.error(err);
    // do a graceful shutdown,
    // close the database connection etc.
    process.exit(1);
});
server.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
    serverLogger.log(`${new Date().toISOString()} - ${ctx.req.method} ${ctx.req.url}`);
    yield next();
}));
const config = require(`../rain-library-client/webpack.${dev ? "dev" : "prod"}`);
if (dev) {
    const compiler = require("webpack")(config);
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
//# sourceMappingURL=server.js.map
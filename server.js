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
const Koa = require("koa");
const Router = require("koa-router");
const api_1 = require("./api");
const auth_1 = require("./auth");
const util_1 = require("./util");
const logger = new util_1.Logger(util_1.LogSource.Server);
process.on("uncaughtException", (err) => {
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
router.use("/api", api_1.ApiRouter.routes());
router.use("/auth", auth_1.AuthRouter.routes());
router.use("*", (ctx, next) => __awaiter(this, void 0, void 0, function* () {
    ctx.status = 404;
    yield next();
}));
const server = new Koa();
server.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
    logger.log(`${new Date().toISOString()} - ${ctx.req.method} ${ctx.req.url}`);
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
            log: new util_1.Logger(util_1.LogSource.Webpack).log,
            path: "/__webpack_hmr",
            heartbeat: 1000
        }
    }));
}
server.use(require("koa-static")(config.output.path));
server.use(router.routes());
server.listen(process.env.PORT || 8000);
logger.info("Server is up and running.");
//# sourceMappingURL=server.js.map
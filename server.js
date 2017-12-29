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
let router = new Router();
router.use(require("koa-bodyparser")());
router.use(require("koa-json")());
router.use("/api", require("./api").routes());
router.use("*", (ctx, next) => __awaiter(this, void 0, void 0, function* () {
    ctx.status = 404;
    yield next();
}));
let server = new Koa();
process.on("uncaughtException", (err) => {
    console.log("whoops! There was an uncaught error", err);
    // do a graceful shutdown,
    // close the database connection etc.
    process.exit(1);
});
server.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
    console.log(chalk_1.default.dim.cyan(`${new Date().toISOString()} - ${ctx.req.method} ${ctx.req.url}`));
    yield next();
}));
const dev = process.env.NODE_ENV === "development";
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
            log: (a, ...b) => console.log(chalk_1.default.grey(a), ...b),
            path: "/__webpack_hmr",
            heartbeat: 1000
        }
    }));
}
server.use(require("koa-static")(config.output.path));
server.use(router.routes());
server.listen(process.env.PORT || 8000);
console.info("Server is up and running.");
//# sourceMappingURL=server.js.map
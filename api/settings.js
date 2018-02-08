"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const KoaRouter = require("koa-router");
const KoaSendfile = require("koa-sendfile");
const path = require("path");
const auth_1 = require("../auth");
const util_1 = require("../util");
const logger = new util_1.Logger(util_1.LogSource.Api);
exports.SettingsRouter = new KoaRouter();
exports.SettingsRouter.get("/", auth_1.AuthWall("admin", "author"), async (ctx) => {
    await KoaSendfile(ctx, path.join(process.cwd(), "settings.json"));
});
exports.SettingsRouter.post("/", auth_1.AuthWall("admin"), async (ctx) => {
    await fs.writeFile(path.join(process.cwd(), "settings.json"), ctx.request.body);
    ctx.status = 200;
});
//# sourceMappingURL=settings.js.map
import * as fs from "fs-extra";
import * as KoaRouter from "koa-router";
import * as KoaSendfile from "koa-sendfile";
import * as path from "path";

import { AuthWall } from "../auth";
import { Logger, LogSource } from "../util";

const logger = new Logger(LogSource.Api);
export let SettingsRouter = new KoaRouter();

SettingsRouter.get("", AuthWall("admin"), async ctx => {
    await KoaSendfile(ctx, path.join(process.cwd(), "settings.json"));
});

SettingsRouter.post("", AuthWall("admin"), async ctx => {
    await fs.writeFile(
        path.join(process.cwd(), "settings.json"),
        ctx.request.body
    );
    ctx.status = 200;
});

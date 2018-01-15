import * as Router from "koa-router";
import { AuthWall } from "../auth";
import { Database } from "../data";
import { Logger, LogSource } from "../util";

const logger = new Logger(LogSource.Api);
export let HoldRouter = new Router();

HoldRouter.get("/book/:id", AuthWall("modify_hold"), async ctx =>
{
    return Database.getHoldsForBook(ctx.params.id);
});
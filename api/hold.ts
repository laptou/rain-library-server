import * as Router from "koa-router";
import { AuthWall } from "../auth";
import { Database } from "../data";
import { Logger, LogSource } from "../util";

const logger = new Logger(LogSource.Api);
export let HoldRouter = new Router();

HoldRouter.get("/book/:isbn/count", AuthWall(), async ctx =>
{
    ctx.body = (await Database.getHoldsForBook(ctx.params.isbn)).length;
});

HoldRouter.get("/book/:isbn", AuthWall("modify_hold"), async ctx =>
{
    ctx.body = await Database.getHoldsForBook(ctx.params.isbn);
});

HoldRouter.get("/person/:id", AuthWall("modify_hold"), async ctx =>
{
    ctx.body = await Database.getHoldsForPerson(ctx.params.id);
});

HoldRouter.get("/me", AuthWall("place_hold"), async ctx =>
{
    ctx.body = await Database.getHoldsForPerson(ctx.state.user);
});
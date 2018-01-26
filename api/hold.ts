import * as Router from "koa-router";
import { AuthWall } from "../auth";
import { Database, Model, Person } from "../data";
import { Logger, LogSource } from "../util";

const logger = new Logger(LogSource.Api);
export let HoldRouter = new Router();

HoldRouter.post("/me", AuthWall("place_hold"), async ctx =>
{
    await Database.saveHold(new Model.Hold({
        date: new Date(),
        person: ctx.state.user.id,
        isbn: ctx.body.isbn,
        completed: false
    }));
});

HoldRouter.get("/:id", AuthWall("place_hold"), async ctx =>
{
    const hold = await Database.getHoldById(ctx.params.id);
    const user: Person = ctx.state.user;

    if (user.permissions.indexOf("modify_hold") !== -1 ||
        (hold.person as Person).id === user.id)
    {
        ctx.body = hold;
        return;
    }
});

HoldRouter.post("/:id", AuthWall("modify_hold"), async ctx =>
{
    const hold = await Database.getHoldById(ctx.params.id);
    const user: Person = ctx.state.user;

    if (user.permissions.indexOf("modify_hold") !== -1 ||
        (hold.person as Person).id === user.id)
    {
        ctx.body = hold;
        return;
    }
});

HoldRouter.get("/book/:isbn", AuthWall("modify_hold"), async ctx =>
{
    ctx.body = await Database.getHoldsForBook(ctx.params.isbn);
});

HoldRouter.get("/book/:isbn/count", AuthWall("place_hold"), async ctx =>
{
    ctx.body = (await Database.getHoldsForBook(ctx.params.isbn)).length;
});

HoldRouter.get("/person/:id", AuthWall("modify_hold"), async ctx =>
{
    ctx.body = await Database.getHoldsForPerson(ctx.params.id);
});

HoldRouter.get("/me", AuthWall("place_hold"), async ctx =>
{
    ctx.body = await Database.getHoldsForPerson(ctx.state.user);
});
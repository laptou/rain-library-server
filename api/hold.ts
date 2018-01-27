import * as Rx from "rxjs/Rx";
import * as Router from "koa-router";
import { AuthWall } from "../auth";
import { Database, Model, Person, Hold } from "../data";
import { Logger, LogSource } from "../util";
import { Context } from "koa";

const logger = new Logger(LogSource.Api);
export let HoldRouter = new Router();

HoldRouter.post("/me", AuthWall("place_hold"), async ctx =>
{
    await Database.saveHold(new Model.Hold({
        date: new Date(),
        person: ctx.state.user.id,
        isbn: ctx.request.body.isbn,
        completed: false
    }));

    ctx.status = 200;
});

const getHolds = (getter: (ctx: Context) => Promise<Hold[]>) =>
{
    return async ctx =>
    {
        ctx.body = await Rx.Observable
            .from(await getter(ctx))
            .flatMap(async h =>
            {
                const checkouts = await Database.getCheckoutsForIsbn(h.isbn);
                const copies = await Database.getBooksByIsbn(h.isbn, false);

                let ready = copies.length > checkouts.length;
                
                if (ready)
                {
                    const holds = await Database.getPendingHoldsForBook(h.isbn, false);
                    ready = holds[0].id === h.id;
                }

                // if we make two calls instead of just using the first one
                // then we can use population for just one of the books
                const copy = await Database.getBookById(copies[0]._id);

                return Object.assign(h.toJSON(), { ready, book: copy });
            })
            .toArray()
            .toPromise();
    };
};

HoldRouter.get(
    "/me",
    AuthWall("place_hold"),
    getHolds(ctx => Database.getHoldsForPerson(ctx.state.user, false)));

HoldRouter.get(
    "/me/pending",
    AuthWall("place_hold"),
    getHolds(ctx => Database.getPendingHoldsForPerson(ctx.state.user, false)));

HoldRouter.get("/:id", AuthWall("place_hold"), async ctx =>
{
    const hold = await Database.getHoldById(ctx.params.id);
    const holder = hold.person as Person;
    const user: Person = ctx.state.user;

    if (user.permissions.indexOf("modify_hold") === -1 &&
        holder.id !== user.id)
    {
        ctx.status = 401;
        return;
    }

    ctx.body = hold;
});

HoldRouter.delete("/:id", AuthWall("place_hold"), async ctx =>
{
    const hold = await Database.getHoldById(ctx.params.id);
    const holder = hold.person as Person;
    const user: Person = ctx.state.user;

    if (user.permissions.indexOf("modify_hold") === -1 &&
        holder.id !== user.id)
    {
        ctx.status = 401;
        return;
    }

    await hold.remove();
});

HoldRouter.post("/:id", AuthWall("modify_hold"), async ctx =>
{
    const hold = await Database.getHoldById(ctx.params.id);
    
    // make sure the user didn't submit any properties that should
    // be resistant to change
    for (const key in ctx.body)
    {
        // right now, completed is the only property
        // that can be changed after the hold is created
        if (["completed"].indexOf(key) === -1)
        {
            ctx.status = 400;
            return;
        }
    }

    if ("completed" in ctx.body && typeof ctx.body.completed !== "boolean")
    {
        ctx.status = 400;
        return;
    }

    Object.assign(hold, ctx.body);

    await hold.save();
});

HoldRouter.get("/book/:isbn", AuthWall("modify_hold"), async ctx =>
{
    ctx.body = await Database.getHoldsForBook(ctx.params.isbn);
});

HoldRouter.get("/book/:isbn/count", AuthWall("place_hold"), async ctx =>
{
    ctx.body = (await Database.getHoldsForBook(ctx.params.isbn)).length;
});

HoldRouter.get(
    "/person/:id",
    AuthWall("modify_hold"),
    getHolds(ctx => Database.getHoldsForPerson(ctx.params.id)));

HoldRouter.get(
    "/person/:id/pending",
    AuthWall("modify_hold"),
    getHolds(ctx => Database.getPendingHoldsForPerson(ctx.params.id)));

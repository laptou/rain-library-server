import * as Rx from "rxjs/Rx";
import * as Router from "koa-router";
import { AuthWall } from "../auth";
import { Database, Model, Person, Hold, Book } from "../data";
import { Logger, LogSource } from "../util";
import { Context } from "koa";

const logger = new Logger(LogSource.Api);
export let HoldRouter = new Router();

const getHolds = (getter: (ctx: Context) => Promise<Hold[]>) =>
{
    return async ctx =>
    {
        ctx.body = await Rx.Observable
            .from(await getter(ctx))
            .flatMap(async h =>
            {
                const checkouts = await Database.getCheckoutsForIsbn(h.isbn);
                const book = await Database.getBookByIsbn(h.isbn);

                let ready = book.copies.length > checkouts.length;

                if (ready)
                {
                    const holds = await Database.getPendingHoldsForBook(h.isbn);
                    ready = holds[0].id === h.id;
                }

                return Object.assign(h.toJSON(), { ready, book });
            })
            .toArray()
            .toPromise();
    };
};

HoldRouter.get(
    "/me",
    AuthWall("place_hold"),
    getHolds(ctx => Database.getHoldsForPerson(ctx.state.user)));

HoldRouter.get(
    "/me/pending",
    AuthWall("place_hold"),
    getHolds(ctx => Database.getPendingHoldsForPerson(ctx.state.user)));

HoldRouter.post("/me", AuthWall("place_hold"), async ctx =>
{
    if (await Rx.Observable
        .from(await Database.getCurrentCheckoutsForUser(ctx.state.user.id))
        .findIndex(c => (c.book as Book).isbn === ctx.request.body.isbn)
        .toPromise() !== -1)
    {
        // if the user has already checked this book out, deny access
        ctx.status = 400;
        return;
    }

    if (await Database.getPendingHoldForPerson(ctx.state.user.id, ctx.request.body.isbn))
    {
        // if the user already has a hold on this book, deny access
        ctx.status = 400;
        return;
    }

    await new Model.Hold({
        date: new Date(),
        person: ctx.state.user.id,
        isbn: ctx.request.body.isbn,
        completed: false
    }).save();

    ctx.status = 200;
});

HoldRouter.get(
    "/person/:id",
    AuthWall("modify_hold"),
    getHolds(ctx => Database.getHoldsForPerson(ctx.params.id)));

HoldRouter.get(
    "/person/:id/pending",
    AuthWall("modify_hold"),
    getHolds(ctx => Database.getPendingHoldsForPerson(ctx.params.id)));

HoldRouter.get("/:id", AuthWall("place_hold"), async ctx =>
{
    const hold = await Database.getHoldById(ctx.params.id);

    if (hold)
    {
        const holder = hold.person as Person;
        const user: Person = ctx.state.user;

        if (user.permissions.indexOf("modify_hold") === -1 &&
            holder.id !== user.id)
        {
            ctx.status = 401;
            return;
        }

        ctx.body = hold;
    }
    else
    {
        ctx.status = 404;
    }
});

HoldRouter.delete("/me/:isbn", AuthWall("place_hold"), async ctx =>
{
    const hold =
        (await Database.getPendingHoldsForPerson(ctx.state.user.id))
            .filter(h =>  h.isbn === ctx.params.isbn);

    if (hold[0])
    {
        await hold[0].remove();
        ctx.status = 200;
    }
    else
    {
        ctx.status = 404;
    }
});

HoldRouter.delete("/:id", AuthWall("modify_hold"), async ctx =>
{
    const hold = await Database.getHoldById(ctx.params.id);

    if (hold)
    {
        const holder = hold.person as Person;
        const user: Person = ctx.state.user;

        if (user.permissions.indexOf("modify_hold") === -1 &&
            holder.id !== user.id)
        {
            // if the user doesn't have permission to delete this hold
            // then pretend it doesn't exist
            ctx.status = 404;
            return;
        }

        await hold.remove();
    }
    else
    {
        ctx.status = 404;
        return;
    }
});

HoldRouter.post("/:id", AuthWall("modify_hold"), async ctx =>
{
    const hold = await Database.getHoldById(ctx.params.id);

    if (hold)
    {

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
    }
    else
    {
        ctx.status = 404;
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

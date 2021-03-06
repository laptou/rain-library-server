import { Context } from "koa";
import * as Router from "koa-router";
import { from } from "rxjs";
import { findIndex, flatMap, toArray } from "rxjs/operators";

import { AuthWall } from "../auth";
import { Book, Database, Hold, Model, Person } from "../data";
import { Logger, LogSource } from "../util";
import * as validate from "./validate";

const logger = new Logger(LogSource.Api);
export let HoldRouter = new Router();

const getHolds = (getter: (ctx: Context) => Promise<Hold[]>) => {
    return async ctx => {
        ctx.body =
            from(await getter(ctx))
                .pipe(
                    flatMap(async h => {
                        const checkouts = await Database.getCheckoutsForIsbn(h.isbn);
                        const book = await Database.getBookByIsbn(h.isbn);

                        let ready = book.copies.length > checkouts.length;

                        if (ready) {
                            const holds = await Database.getPendingHoldsForBook(h.isbn);
                            ready = holds[0].id === h.id;
                        }

                        return Object.assign(h.toJSON(), { ready, book }) as Hold;
                    }),
                    toArray())
                .toPromise();
    };
};

HoldRouter
    .param("isbn", validate.Isbn)
    .param("id", validate.Id);

HoldRouter
    .get("/me", AuthWall("place_hold"), getHolds(ctx => Database.getHoldsForPerson(ctx.state.user)))
    .get("/me/pending", AuthWall("place_hold"), getHolds(ctx => Database.getPendingHoldsForPerson(ctx.state.user)))
    .post("/me/:isbn", AuthWall("place_hold"), async ctx => {
        if (await from(await Database.getCurrentCheckoutsForPerson(ctx.state.user.id))
            .pipe(findIndex(c => (c.book as Book).isbn === ctx.params.isbn))
            .toPromise() !== -1) {
            // if the user has already checked this book out, deny access
            ctx.status = 400;
            return;
        }

        if (await Database.getPendingHoldForPerson(ctx.state.user.id, ctx.params.isbn)) {
            // if the user already has a hold on this book, deny access
            ctx.status = 400;
            return;
        }

        const model = await new Model.Hold({
            date: new Date(),
            person: ctx.state.user.id,
            isbn: ctx.params.isbn,
            completed: false
        });

        model.save();

        ctx.status = 200;
    })
    .delete("/me/:isbn", AuthWall("place_hold"), async ctx => {
        const hold = await Database.getPendingHoldForPerson(ctx.state.user.id, ctx.params.isbn);

        if (hold[0]) {
            await hold[0].remove();
            ctx.status = 200;
        }
        else {
            ctx.status = 404;
        }
    });

HoldRouter
    .get("/person/:id", AuthWall("modify_hold"), getHolds(ctx => Database.getHoldsForPerson(ctx.params.id)))
    .get("/person/:id/pending",
        AuthWall("modify_hold"),
        getHolds(ctx => Database.getPendingHoldsForPerson(ctx.params.id)));

HoldRouter
    .get("/:id", AuthWall("place_hold"), async ctx => {
        const hold = await Database.getHoldById(ctx.params.id);

        if (hold) {
            const holder = hold.person as Person;
            const user: Person = ctx.state.user;

            if (!user.permissions.includes("modify_hold") &&
                holder.id !== user.id) {
                ctx.status = 401;
                return;
            }

            ctx.body = hold;
        }
        else {
            ctx.status = 404;
        }
    })
    .post("/:id", AuthWall("modify_hold"), async ctx => {
        const hold = await Database.getHoldById(ctx.params.id);

        if (hold) {
            if (!validate.Object(ctx.request.body, { completed: "boolean" })) {
                ctx.status = 400;
                return;
            }

            Object.assign(hold, ctx.request.body);

            await hold.save();
        }
        else {
            ctx.status = 404;
        }
    })
    .delete("/:id", AuthWall("modify_hold"), async ctx => {
        const hold = await Database.getHoldById(ctx.params.id);

        if (hold) {
            const holder = hold.person as Person;

            await hold.remove();
        }
        else {
            ctx.status = 404;
            return;
        }
    });

HoldRouter
    .get("/book/:isbn/all", AuthWall("modify_hold"), async ctx => {
        ctx.body = await Database.getHoldsForBook(ctx.params.isbn);
    })
    .get("/book/:isbn", AuthWall("modify_hold"), async ctx => {
        ctx.body = await Database.getPendingHoldsForBook(ctx.params.isbn);
    })
    .get("/book/:isbn/count", AuthWall("place_hold"), async ctx => {
        ctx.body = (await Database.getPendingHoldsForBook(ctx.params.isbn)).length;
    });

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx = require("rxjs/Rx");
const Router = require("koa-router");
const auth_1 = require("../auth");
const data_1 = require("../data");
const util_1 = require("../util");
const logger = new util_1.Logger(util_1.LogSource.Api);
exports.HoldRouter = new Router();
const getHolds = (getter) => {
    return async (ctx) => {
        ctx.body = await Rx.Observable
            .from(await getter(ctx))
            .flatMap(async (h) => {
            const checkouts = await data_1.Database.getCheckoutsForIsbn(h.isbn);
            const copies = await data_1.Database.getBooksByIsbn(h.isbn, false);
            let ready = copies.length > checkouts.length;
            if (ready) {
                const holds = await data_1.Database.getPendingHoldsForBook(h.isbn, false);
                ready = holds[0].id === h.id;
            }
            // if we make two calls instead of just using the first one
            // then we can use population for just one of the books
            const copy = await data_1.Database.getBookById(copies[0]._id);
            return Object.assign(h.toJSON(), { ready, book: copy });
        })
            .toArray()
            .toPromise();
    };
};
exports.HoldRouter.get("/me", auth_1.AuthWall("place_hold"), getHolds(ctx => data_1.Database.getHoldsForPerson(ctx.state.user, false)));
exports.HoldRouter.get("/me/pending", auth_1.AuthWall("place_hold"), getHolds(ctx => data_1.Database.getPendingHoldsForPerson(ctx.state.user, false)));
exports.HoldRouter.post("/me", auth_1.AuthWall("place_hold"), async (ctx) => {
    if (await Rx.Observable
        .from(await data_1.Database.getCurrentCheckoutsForUser(ctx.state.user.id))
        .findIndex(c => c.book.isbn === ctx.request.body.isbn)
        .toPromise() !== -1) {
        // if the user has already checked this book out, deny access
        ctx.status = 400;
        return;
    }
    if (await data_1.Database.getPendingHoldForPerson(ctx.state.user.id, ctx.request.body.isbn)) {
        // if the user already has a hold on this book, deny access
        ctx.status = 400;
        return;
    }
    await data_1.Database.saveHold(new data_1.Model.Hold({
        date: new Date(),
        person: ctx.state.user.id,
        isbn: ctx.request.body.isbn,
        completed: false
    }));
    ctx.status = 200;
});
exports.HoldRouter.get("/person/:id", auth_1.AuthWall("modify_hold"), getHolds(ctx => data_1.Database.getHoldsForPerson(ctx.params.id)));
exports.HoldRouter.get("/person/:id/pending", auth_1.AuthWall("modify_hold"), getHolds(ctx => data_1.Database.getPendingHoldsForPerson(ctx.params.id)));
exports.HoldRouter.get("/:id", auth_1.AuthWall("place_hold"), async (ctx) => {
    const hold = await data_1.Database.getHoldById(ctx.params.id);
    if (hold) {
        const holder = hold.person;
        const user = ctx.state.user;
        if (user.permissions.indexOf("modify_hold") === -1 &&
            holder.id !== user.id) {
            ctx.status = 401;
            return;
        }
        ctx.body = hold;
    }
    else {
        ctx.status = 404;
    }
});
exports.HoldRouter.delete("/me/:isbn", auth_1.AuthWall("place_hold"), async (ctx) => {
    const hold = (await data_1.Database.getPendingHoldsForPerson(ctx.state.user.id))
        .filter(h => h.isbn === ctx.params.isbn);
    if (hold[0]) {
        await hold[0].remove();
        ctx.status = 200;
    }
    else {
        ctx.status = 404;
    }
});
exports.HoldRouter.delete("/:id", auth_1.AuthWall("modify_hold"), async (ctx) => {
    const hold = await data_1.Database.getHoldById(ctx.params.id);
    if (hold) {
        const holder = hold.person;
        const user = ctx.state.user;
        if (user.permissions.indexOf("modify_hold") === -1 &&
            holder.id !== user.id) {
            // if the user doesn't have permission to delete this hold
            // then pretend it doesn't exist
            ctx.status = 404;
            return;
        }
        await hold.remove();
    }
    else {
        ctx.status = 404;
        return;
    }
});
exports.HoldRouter.post("/:id", auth_1.AuthWall("modify_hold"), async (ctx) => {
    const hold = await data_1.Database.getHoldById(ctx.params.id);
    if (hold) {
        // make sure the user didn't submit any properties that should
        // be resistant to change
        for (const key in ctx.body) {
            // right now, completed is the only property
            // that can be changed after the hold is created
            if (["completed"].indexOf(key) === -1) {
                ctx.status = 400;
                return;
            }
        }
        if ("completed" in ctx.body && typeof ctx.body.completed !== "boolean") {
            ctx.status = 400;
            return;
        }
        Object.assign(hold, ctx.body);
        await hold.save();
    }
    else {
        ctx.status = 404;
    }
});
exports.HoldRouter.get("/book/:isbn", auth_1.AuthWall("modify_hold"), async (ctx) => {
    ctx.body = await data_1.Database.getHoldsForBook(ctx.params.isbn);
});
exports.HoldRouter.get("/book/:isbn/count", auth_1.AuthWall("place_hold"), async (ctx) => {
    ctx.body = (await data_1.Database.getHoldsForBook(ctx.params.isbn)).length;
});
//# sourceMappingURL=hold.js.map
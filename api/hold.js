"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const Rx = require("rxjs/Rx");
const auth_1 = require("../auth");
const data_1 = require("../data");
const util_1 = require("../util");
const validate = require("./validate");
const logger = new util_1.Logger(util_1.LogSource.Api);
exports.HoldRouter = new Router();
const getHolds = (getter) => {
    return async (ctx) => {
        ctx.body = await Rx.Observable
            .from(await getter(ctx))
            .flatMap(async (h) => {
            const checkouts = await data_1.Database.getCheckoutsForIsbn(h.isbn);
            const book = await data_1.Database.getBookByIsbn(h.isbn);
            let ready = book.copies.length > checkouts.length;
            if (ready) {
                const holds = await data_1.Database.getPendingHoldsForBook(h.isbn);
                ready = holds[0].id === h.id;
            }
            return Object.assign(h.toJSON(), { ready, book });
        })
            .toArray()
            .toPromise();
    };
};
exports.HoldRouter
    .param("isbn", validate.Isbn)
    .param("id", validate.Id);
exports.HoldRouter
    .get("/me", auth_1.AuthWall("place_hold"), getHolds(ctx => data_1.Database.getHoldsForPerson(ctx.state.user)))
    .get("/me/pending", auth_1.AuthWall("place_hold"), getHolds(ctx => data_1.Database.getPendingHoldsForPerson(ctx.state.user)))
    .post("/me/:isbn", auth_1.AuthWall("place_hold"), async (ctx) => {
    if (await Rx.Observable
        .from(await data_1.Database.getCurrentCheckoutsForPerson(ctx.state.user.id))
        .findIndex(c => c.book.isbn === ctx.params.isbn)
        .toPromise() !== -1) {
        // if the user has already checked this book out, deny access
        ctx.status = 400;
        return;
    }
    if (await data_1.Database.getPendingHoldForPerson(ctx.state.user.id, ctx.params.isbn)) {
        // if the user already has a hold on this book, deny access
        ctx.status = 400;
        return;
    }
    const model = await new data_1.Model.Hold({
        date: new Date(),
        person: ctx.state.user.id,
        isbn: ctx.params.isbn,
        completed: false
    });
    model.save();
    ctx.status = 200;
})
    .delete("/me/:isbn", auth_1.AuthWall("place_hold"), async (ctx) => {
    const hold = await data_1.Database.getPendingHoldForPerson(ctx.state.user.id, ctx.params.isbn);
    if (hold[0]) {
        await hold[0].remove();
        ctx.status = 200;
    }
    else {
        ctx.status = 404;
    }
});
exports.HoldRouter
    .get("/person/:id", auth_1.AuthWall("modify_hold"), getHolds(ctx => data_1.Database.getHoldsForPerson(ctx.params.id)))
    .get("/person/:id/pending", auth_1.AuthWall("modify_hold"), getHolds(ctx => data_1.Database.getPendingHoldsForPerson(ctx.params.id)));
exports.HoldRouter
    .get("/:id", auth_1.AuthWall("place_hold"), async (ctx) => {
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
})
    .post("/:id", auth_1.AuthWall("modify_hold"), async (ctx) => {
    const hold = await data_1.Database.getHoldById(ctx.params.id);
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
    .delete("/:id", auth_1.AuthWall("modify_hold"), async (ctx) => {
    const hold = await data_1.Database.getHoldById(ctx.params.id);
    if (hold) {
        const holder = hold.person;
        await hold.remove();
    }
    else {
        ctx.status = 404;
        return;
    }
});
exports.HoldRouter
    .get("/book/:isbn/all", auth_1.AuthWall("modify_hold"), async (ctx) => {
    ctx.body = await data_1.Database.getHoldsForBook(ctx.params.isbn);
})
    .get("/book/:isbn", auth_1.AuthWall("modify_hold"), async (ctx) => {
    ctx.body = await data_1.Database.getPendingHoldsForBook(ctx.params.isbn);
})
    .get("/book/:isbn/count", auth_1.AuthWall("place_hold"), async (ctx) => {
    ctx.body = (await data_1.Database.getPendingHoldsForBook(ctx.params.isbn)).length;
});
//# sourceMappingURL=hold.js.map
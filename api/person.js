"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const Rx = require("rxjs");
const auth_1 = require("../auth");
const data_1 = require("../data");
const book_1 = require("./book");
const validate = require("./validate");
exports.PersonRouter = new Router();
exports.PersonRouter.param("id", validate.Id);
exports.PersonRouter
    .get("/:id", async (ctx) => {
    try {
        ctx.response.body = await data_1.Database.getPersonById(ctx.params.id);
    }
    catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
})
    .post("/:id", auth_1.AuthWall("modify_person"), async (ctx) => {
    try {
        const person = await data_1.Database.getPersonById(ctx.params.id);
        if (!person) {
            return; // will fallback to 404
        }
        const data = ctx.request.body;
        const schema = data_1.Model.Person.schema.obj;
        // make sure it doesn't contain any weird keys
        for (const key in data) {
            if (!data.hasOwnProperty(key))
                continue;
            if (!(key in schema)) {
                ctx.status = 400;
                return;
            }
            // id cannot be changed
            if (key === "id" || key === "_id") {
                ctx.status = 400;
                return;
            }
            if (key === "permissions") {
                if (!(data.permissions instanceof Array)) {
                    ctx.status = 400;
                    return;
                }
                if (!person.permissions.every(p => data.permissions.indexOf(p) !== -1)) {
                    ctx.status = 403;
                    return;
                }
            }
            if (key === "password") {
                if (ctx.state.user.id === person.id)
                    continue;
                if (ctx.state.user.permissions.indexOf("admin") !== -1)
                    continue;
                ctx.status = 403;
                return;
            }
        }
        Object.assign(person, data);
        person.save();
        ctx.status = 200;
        ctx.response.body = person;
    }
    catch (err) {
        ctx.response.status = 500;
    }
});
exports.PersonRouter
    .get("/me/status/checkedout", auth_1.AuthWall(), async (ctx) => {
    ctx.response.body = await data_1.Database.getCurrentCheckoutsForUser(ctx.state.user.id);
})
    .get("/me/status/onhold", auth_1.AuthWall(), async (ctx) => {
    ctx.response.body = await data_1.Database.getPendingHoldsForPerson(ctx.state.user.id);
})
    .get("/me/status/current", auth_1.AuthWall(), async (ctx) => {
    const checkouts = await data_1.Database.getCurrentCheckoutsForUser(ctx.state.user.id);
    const holds = await data_1.Database.getPendingHoldsForPerson(ctx.state.user.id);
    ctx.response.body = [
        ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
        ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))
    ];
})
    .get("/me/status/all", auth_1.AuthWall(), async (ctx) => {
    const checkouts = await data_1.Database.getCheckoutsForUser(ctx.state.user.id);
    const holds = await data_1.Database.getPendingHoldsForPerson(ctx.state.user.id);
    ctx.response.body = [
        ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
        ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))
    ];
})
    .get("/:id/status/checkedout", auth_1.AuthWall("modify_person"), async (ctx) => {
    ctx.response.body = await data_1.Database.getCurrentCheckoutsForUser(ctx.params.id);
})
    .get("/:id/status/onhold", auth_1.AuthWall("modify_person"), async (ctx) => {
    ctx.response.body = await data_1.Database.getPendingHoldsForPerson(ctx.params.id);
})
    .get("/:id/status/all", auth_1.AuthWall("modify_person"), async (ctx) => {
    const checkouts = await data_1.Database.getCurrentCheckoutsForUser(ctx.params.id);
    const holds = await data_1.Database.getPendingHoldsForPerson(ctx.params.id);
    ctx.response.body = [
        ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
        ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))
    ];
})
    .get("/:id/status/all", auth_1.AuthWall("modify_person"), async (ctx) => {
    const checkouts = await data_1.Database.getCheckoutsForUser(ctx.params.id);
    const holds = await data_1.Database.getPendingHoldsForPerson(ctx.params.id);
    ctx.response.body = [
        ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
        ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))
    ];
})
    .get("/me/status/:isbn", auth_1.AuthWall(), async (ctx) => {
    const checkouts = await data_1.Database.getCurrentCheckoutsForUser(ctx.state.user.id, ctx.params.isbn);
    if (checkouts.length > 0) {
        const checkout = checkouts.sort((a, b) => a.start < b.start ? -1 : 1)[0];
        if (checkout.due < new Date())
            ctx.response.body = { status: book_1.BookStatus.Overdue, checkout };
        else
            ctx.response.body = { status: book_1.BookStatus.CheckedOut, checkout };
        return;
    }
    const holds = await data_1.Database.getPendingHoldsForBook(ctx.params.isbn, { populate: false });
    const position = await Rx.Observable
        .from(holds)
        .findIndex((hold) => hold.person.toString() === ctx.state.user.id)
        .toPromise();
    if (position >= 0) {
        ctx.response.body = { status: book_1.BookStatus.OnHold, hold: holds[position], position };
        return;
    }
    ctx.response.body = { status: book_1.BookStatus.None };
});
exports.PersonRouter.get("/u/:un", async (ctx) => {
    try {
        ctx.response.body = await data_1.Database.getPersonByUsername(ctx.params.un);
    }
    catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});
exports.PersonRouter.get("/search/:query", async (ctx) => {
    try {
        ctx.response.body = await data_1.Database.searchPeople(ctx.params.query);
    }
    catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});
//# sourceMappingURL=person.js.map
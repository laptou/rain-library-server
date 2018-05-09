"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt = require("bcrypt");
const Router = require("koa-router");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
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
        if (ctx.response.body === null)
            ctx.status = 404;
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
                if (!ctx.state.user.permissions.includes("admin") &&
                    person.permissions.includes("admin")) {
                    // you can't change an admin's permissions
                    ctx.status = 401;
                    ctx.response.message = "You cannot change an admin's permissions.";
                    return;
                }
                if (!data.permissions.includes("admin") &&
                    person.id.toString() === ctx.state.user.id.toString() &&
                    person.permissions.includes("admin")) {
                    // you can't change your own permissions
                    ctx.status = 400;
                    ctx.response.message = "You cannot remove your own admin status.";
                    return;
                }
            }
            if (key === "password") {
                if (ctx.state.user.id === person.id)
                    continue;
                if (ctx.state.user.permissions.includes("admin"))
                    continue;
                ctx.status = 403;
                return;
            }
        }
        if ("password" in data && data.password) {
            const pw = data.password;
            delete data.password;
            person.password = await new Promise((res, rej) => bcrypt.hash(pw, 12, (err, hash) => {
                if (err)
                    rej(err);
                res(hash);
            }));
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
    ctx.response.body = await data_1.Database.getCurrentCheckoutsForPerson(ctx.state.user.id);
})
    .get("/me/status/onhold", auth_1.AuthWall(), async (ctx) => {
    ctx.response.body = await data_1.Database.getPendingHoldsForPerson(ctx.state.user.id);
})
    .get("/me/status/current", auth_1.AuthWall(), async (ctx) => {
    const fines = await data_1.Database.getCurrentFinesForPerson(ctx.state.user.id);
    const checkouts = await data_1.Database.getCurrentCheckoutsForPerson(ctx.state.user.id);
    const holds = await data_1.Database.getPendingHoldsForPerson(ctx.state.user.id);
    ctx.response.body = [
        ...fines.map(c => Object.assign(c.toJSON(), { type: "fine" })),
        ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
        ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))
    ];
})
    .get("/me/status/all", auth_1.AuthWall(), async (ctx) => {
    const fines = await data_1.Database.getFinesForPerson(ctx.state.user.id);
    const checkouts = await data_1.Database.getCheckoutsForPerson(ctx.state.user.id);
    const holds = await data_1.Database.getPendingHoldsForPerson(ctx.state.user.id);
    ctx.response.body = [
        ...fines.map(c => Object.assign(c.toJSON(), { type: "fine" })),
        ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
        ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))
    ];
})
    .get("/:id/status/checkedout", auth_1.AuthWall("modify_person"), async (ctx) => {
    ctx.response.body = await data_1.Database.getCurrentCheckoutsForPerson(ctx.params.id);
})
    .get("/:id/status/onhold", auth_1.AuthWall("modify_person"), async (ctx) => {
    ctx.response.body = await data_1.Database.getPendingHoldsForPerson(ctx.params.id);
})
    .get("/:id/status/current", auth_1.AuthWall("modify_person"), async (ctx) => {
    const fines = await data_1.Database.getCurrentFinesForPerson(ctx.params.id);
    const checkouts = await data_1.Database.getCurrentCheckoutsForPerson(ctx.params.id);
    const holds = await data_1.Database.getPendingHoldsForPerson(ctx.params.id);
    ctx.response.body = [
        ...fines.map(c => Object.assign(c.toJSON(), { type: "fine" })),
        ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
        ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))
    ];
})
    .get("/:id/status/all", auth_1.AuthWall("modify_person"), async (ctx) => {
    const fines = await data_1.Database.getFinesForPerson(ctx.params.id);
    const checkouts = await data_1.Database.getCheckoutsForPerson(ctx.params.id);
    const holds = await data_1.Database.getPendingHoldsForPerson(ctx.params.id);
    ctx.response.body = [
        ...fines.map(c => Object.assign(c.toJSON(), { type: "fine" })),
        ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
        ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))
    ];
})
    .get("/me/status/:isbn", auth_1.AuthWall(), async (ctx) => {
    const checkouts = await data_1.Database.getCurrentCheckoutsForPerson(ctx.state.user.id, ctx.params.isbn);
    if (checkouts.length > 0) {
        const checkout = checkouts.sort((a, b) => a.start < b.start ? -1 : 1)[0];
        ctx.response.body = { status: checkout.due < new Date() ? book_1.BookStatus.Overdue : book_1.BookStatus.CheckedOut, checkout };
        return;
    }
    const holds = await data_1.Database.getPendingHoldsForBook(ctx.params.isbn, { populate: false });
    const position = await rxjs_1.from(holds)
        .pipe(operators_1.findIndex((hold) => hold.person.toString() === ctx.state.user.id))
        .toPromise();
    if (position >= 0) {
        ctx.response.body = { status: book_1.BookStatus.OnHold, hold: holds[position], position };
        return;
    }
    ctx.response.body = { status: book_1.BookStatus.None };
});
exports.PersonRouter.get("/u/:un", async (ctx) => {
    ctx.response.body = await data_1.Database.getPersonByUsername(ctx.params.un);
    if (ctx.response.body === null) {
        ctx.status = 404;
        ctx.message = "That person could not be found.";
    }
});
exports.PersonRouter.get("/search/:query", async (ctx) => {
    ctx.response.body = await data_1.Database.searchPeople(ctx.params.query);
});
//# sourceMappingURL=person.js.map
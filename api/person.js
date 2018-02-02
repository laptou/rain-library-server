"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const auth_1 = require("../auth");
const data_1 = require("../data");
exports.PersonRouter = new Router();
exports.PersonRouter.get("/:id", async (ctx) => {
    try {
        ctx.response.body = await data_1.Database.getPersonById(ctx.params.id);
    }
    catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});
exports.PersonRouter.get("/username/:un", async (ctx) => {
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
exports.PersonRouter.post("/:id", auth_1.AuthWall("modify_person"), async (ctx) => {
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
//# sourceMappingURL=person.js.map
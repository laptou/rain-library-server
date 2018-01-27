"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const data_1 = require("../data");
exports.PersonRouter = new Router();
exports.PersonRouter.get("/id/:id", async (ctx) => {
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
exports.PersonRouter.get("/search/:name", async (ctx) => {
    try {
        // ctx.response.body = await Database.peop(ctx.params.name);
    }
    catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});
//# sourceMappingURL=person.js.map
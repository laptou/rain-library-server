import * as Router from "koa-router";

import { Database } from "../data";

export const PersonRouter = new Router();

PersonRouter.get("/id/:id", async ctx => {
    try {
        ctx.response.body = await Database.getPersonById(ctx.params.id);
    } catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});

PersonRouter.get("/username/:un", async ctx => {
    try {
        ctx.response.body = await Database.getPersonByUsername(ctx.params.un);
    } catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});

PersonRouter.get("/search/:query", async ctx => {
    try {
        ctx.response.body = await Database.searchPeople(ctx.params.query);
    } catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});

import * as Router from "koa-router";

import { AuthWall } from "../auth";
import { Database, Model } from "../data";

export const PersonRouter = new Router();

PersonRouter.get("/:id", async ctx => {
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

PersonRouter.post("/:id", AuthWall("modify_person"), async ctx => {
    try {
        const person = await Database.getPersonById(ctx.params.id);
        if (!person) {
            return; // will fallback to 404
        }

        const data = ctx.request.body;
        const schema = Model.Person.schema.obj;

        // make sure it doesn't contain any weird keys
        for (const key in data) {
            if (!data.hasOwnProperty(key)) continue;

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

                if (
                    !person.permissions.every(
                        p => data.permissions.indexOf(p) !== -1
                    )
                ) {
                    ctx.status = 403;
                    return;
                }
            }

            if (key === "password") {
                if (ctx.state.user.id === person.id) continue;

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
    } catch (err) {
        ctx.response.status = 500;
    }
});

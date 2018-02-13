import * as bcrypt from "bcrypt";
import * as Router from "koa-router";
import * as Rx from "rxjs";

import { AuthWall } from "../auth";
import { Database, Hold, Model } from "../data";
import { BookStatus } from "./book";
import * as validate from "./validate";

export const PersonRouter = new Router();

PersonRouter.param("id", validate.Id);

PersonRouter
    .get("/:id", async ctx =>
    {
        try
        {
            ctx.response.body = await Database.getPersonById(ctx.params.id);
            if (ctx.response.body === null) ctx.status = 404;
        } catch (err)
        {
            ctx.response.status = 403;
            ctx.response.body = err.message;
        }
    })
    .post("/:id", AuthWall("modify_person"), async ctx =>
    {
        try
        {
            const person = await Database.getPersonById(ctx.params.id);
            if (!person)
            {
                return; // will fallback to 404
            }

            const data = ctx.request.body;
            const schema = Model.Person.schema.obj;

            // make sure it doesn't contain any weird keys
            for (const key in data)
            {
                if (!data.hasOwnProperty(key)) continue;

                if (!(key in schema))
                {
                    ctx.status = 400;
                    return;
                }

                // id cannot be changed
                if (key === "id" || key === "_id")
                {
                    ctx.status = 400;
                    return;
                }

                if (key === "permissions")
                {
                    if (!(data.permissions instanceof Array))
                    {
                        ctx.status = 400;
                        return;
                    }

                    if (ctx.state.user.permissions.includes("admin") &&
                        !person.permissions.includes("admin"))
                    {
                        // you can't change your own permissions
                        ctx.status = 401;
                        ctx.response.message = "You cannot change an admin's permissions.";
                        return;
                    }

                    if (!data.permissions.includes("admin") &&
                        person.id.toString() === ctx.state.user.id.toString() &&
                        person.permissions.includes("admin"))
                    {
                        // you can't change your own permissions
                        ctx.status = 400;
                        ctx.response.message = "You cannot remove your own admin status.";
                        return;
                    }
                }

                if (key === "password")
                {
                    if (ctx.state.user.id === person.id) continue;

                    if (ctx.state.user.permissions.includes("admin"))
                        continue;

                    ctx.status = 403;
                    return;
                }
            }

            if ("password" in data && data.password)
            {
                const pw = data.password;
                delete data.password;

                person.password = await new Promise<string>((res, rej) => bcrypt.hash(pw, 12, (err, hash) =>
                {
                    if (err) rej(err);
                    res(hash);
                }));
            }

            Object.assign(person, data);

            person.save();

            ctx.status = 200;
            ctx.response.body = person;
        } catch (err)
        {
            ctx.response.status = 500;
        }
    });

PersonRouter
    .get("/me/status/checkedout", AuthWall(), async ctx =>
    {
        ctx.response.body = await Database.getCurrentCheckoutsForPerson(ctx.state.user.id);
    })
    .get("/me/status/onhold", AuthWall(), async ctx =>
    {
        ctx.response.body = await Database.getPendingHoldsForPerson(ctx.state.user.id);
    })
    .get("/me/status/current", AuthWall(), async ctx =>
    {
        const fines = await Database.getCurrentFinesForPerson(ctx.state.user.id);
        const checkouts = await Database.getCurrentCheckoutsForPerson(ctx.state.user.id);
        const holds = await Database.getPendingHoldsForPerson(ctx.state.user.id);

        ctx.response.body = [
            ...fines.map(c => Object.assign(c.toJSON(), { type: "fine" })),
            ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
            ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))];
    })
    .get("/me/status/all", AuthWall(), async ctx =>
    {
        const fines = await Database.getFinesForPerson(ctx.state.user.id);
        const checkouts = await Database.getCheckoutsForPerson(ctx.state.user.id);
        const holds = await Database.getPendingHoldsForPerson(ctx.state.user.id);

        ctx.response.body = [
            ...fines.map(c => Object.assign(c.toJSON(), { type: "fine" })),
            ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
            ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))];
    })
    .get("/:id/status/checkedout", AuthWall("modify_person"), async ctx =>
    {
        ctx.response.body = await Database.getCurrentCheckoutsForPerson(ctx.params.id);
    })
    .get("/:id/status/onhold", AuthWall("modify_person"), async ctx =>
    {
        ctx.response.body = await Database.getPendingHoldsForPerson(ctx.params.id);
    })
    .get("/:id/status/current", AuthWall("modify_person"), async ctx =>
    {
        const fines = await Database.getCurrentFinesForPerson(ctx.params.id);
        const checkouts = await Database.getCurrentCheckoutsForPerson(ctx.params.id);
        const holds = await Database.getPendingHoldsForPerson(ctx.params.id);

        ctx.response.body = [
            ...fines.map(c => Object.assign(c.toJSON(), { type: "fine" })),
            ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
            ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))];
    })
    .get("/:id/status/all", AuthWall("modify_person"), async ctx =>
    {
        const fines = await Database.getFinesForPerson(ctx.params.id);
        const checkouts = await Database.getCheckoutsForPerson(ctx.params.id);
        const holds = await Database.getPendingHoldsForPerson(ctx.params.id);

        ctx.response.body = [
            ...fines.map(c => Object.assign(c.toJSON(), { type: "fine" })),
            ...checkouts.map(c => Object.assign(c.toJSON(), { type: "checkout" })),
            ...holds.map(h => Object.assign(h.toJSON(), { type: "hold" }))];
    })
    .get("/me/status/:isbn", AuthWall(), async ctx =>
    {
        const checkouts = await Database.getCurrentCheckoutsForPerson(ctx.state.user.id, ctx.params.isbn);

        if (checkouts.length > 0)
        {
            const checkout = checkouts.sort((a, b) => a.start < b.start ? -1 : 1)[0];

            if (checkout.due < new Date())
                ctx.response.body = { status: BookStatus.Overdue, checkout };
            else
                ctx.response.body = { status: BookStatus.CheckedOut, checkout };
            return;
        }

        const holds = await Database.getPendingHoldsForBook(ctx.params.isbn, { populate: false });
        const position = await Rx.Observable
            .from(holds)
            .findIndex((hold: Hold) => hold.person.toString() === ctx.state.user.id)
            .toPromise();

        if (position >= 0)
        {
            ctx.response.body = { status: BookStatus.OnHold, hold: holds[position], position };
            return;
        }

        ctx.response.body = { status: BookStatus.None };
    });

PersonRouter.get("/u/:un", async ctx =>
{
    ctx.response.body = await Database.getPersonByUsername(ctx.params.un);

    if (ctx.response.body === null)
    {
        ctx.status = 404;
        ctx.message = "That person could not be found.";
    }
});

PersonRouter.get("/search/:query", async ctx =>
{
    ctx.response.body = await Database.searchPeople(ctx.params.query);
});

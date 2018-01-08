import * as Router from "koa-router";

export const PersonRouter = new Router();

PersonRouter.get("/id::id", async ctx =>
{
    try
    {
        // const id = model.Uuid.parse(ctx.params.id);
        // ctx.response.body = await Database.getPerson(id);
    }
    catch (err)
    {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});

PersonRouter.get("/search/:name", async ctx =>
{
    try
    {
        // ctx.response.body = await Database.searchPeople(ctx.params.name);
    }
    catch (err)
    {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});
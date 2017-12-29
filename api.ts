import * as Router from "koa-router";
import { Database } from "./data";
import * as Model from "./model";

let router = new Router();

let bookRouter = new Router();

bookRouter.get("/isbn::isbn", async ctx =>
{
    try
    {
        let isbn = Model.Isbn.parse(ctx.params.isbn);   
        ctx.response.body = await Database.getBooksByIsbn(isbn);
    }
    catch (err)
    {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});

bookRouter.get("/id::id", async ctx =>
{
    try
    {
        let id = Model.Uuid.parse(ctx.params.id);
        ctx.response.body = await Database.getBookById(id);
    }
    catch (err)
    {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});

bookRouter.get("/find/title::name", async ctx =>
{
    try
    {
        ctx.response.body = await Database.findBooksByTitle(ctx.params.name);
    }
    catch (err)
    {
        ctx.response.status = 500;
        ctx.response.body = err.message;
        console.error(err);
    }
});

let personRouter = new Router();

personRouter.get("/id::id", async ctx =>
{
    try
    {
        let id = Model.Uuid.parse(ctx.params.id);
        ctx.response.body = await Database.getPerson(id);
    }
    catch (err)
    {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});

personRouter.get("/search/:name", async ctx =>
{
    try
    {
        ctx.response.body = await Database.searchPeople(ctx.params.name);
    }
    catch (err)
    {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});

router.use("/book", bookRouter.routes());
router.use("/person", personRouter.routes());
router.use(async (ctx, next) =>
           {
               console.log("api: %s - %s %s", new Date().toISOString(), ctx.req.method, ctx.req.url);
               await next();
           });

module.exports = router;
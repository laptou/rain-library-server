import * as Router from "koa-router";
import { Database } from "../data";
import * as Model from "../model";

export const BookRouter = new Router();

BookRouter.get("/isbn::isbn", async ctx =>
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

BookRouter.get("/id::id", async ctx =>
{
    try
    {
        let id = Model.Uuid.parse(ctx.params.id);
        // ctx.response.body = await Database.getBookById(id);
    }
    catch (err)
    {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
});

BookRouter.get("/find/title::name", async ctx =>
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
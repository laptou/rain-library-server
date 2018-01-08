import * as Router from "koa-router";
import { Database } from "../data";
import { Logger, LogSource } from "../util";

const logger = new Logger(LogSource.Api);
export const BookRouter = new Router();

BookRouter.get("/isbn/:isbn", async ctx =>
{
    try
    {
        ctx.response.body = await Database.getBooksByIsbn(ctx.params.isbn);
    }
    catch (err)
    {
        ctx.response.status = 500;
        ctx.response.body = err.message;
        logger.error(err);
    }
});

BookRouter.get("/id/:id", async ctx =>
{
    try
    {
        ctx.response.body = await Database.getBookById(ctx.params.id);
    }
    catch (err)
    {
        ctx.response.status = 500;
        ctx.response.body = err.message;
        logger.error(err);
    }
});

BookRouter.get("/title/:name", async ctx =>
{
    try
    {
        ctx.response.body = await Database.getBooksByTitle(ctx.params.name);
    }
    catch (err)
    {
        ctx.response.status = 500;
        ctx.response.body = err.message;
        logger.error(err);
    }
});

BookRouter.get("/search/:query", async ctx =>
{
    try
    {
        ctx.response.body = await Database.searchBooks(ctx.params.query);
    }
    catch (err)
    {
        ctx.response.status = 500;
        ctx.response.body = err.message;
        logger.error(err);
    }
});

BookRouter.get("/search/title/:query", async ctx =>
{
    try
    {
        ctx.response.body = await Database.searchBooksByTitle(ctx.params.query);
    }
    catch (err)
    {
        ctx.response.status = 500;
        ctx.response.body = err.message;
        logger.error(err);
    }
});
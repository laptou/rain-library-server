import * as Router from "koa-router";
import { AuthWall } from "../auth";
import { Book, Database } from "../data";
import { Logger, LogSource } from "../util";
import { Linq } from "../util/linq";

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
        let limit = null;
    
        if (ctx.query.limit) limit = parseInt(ctx.query.limit);
    
        let books =
            Linq.array<Book>([...await Database.searchBooksByTitle(ctx.params.query, true, limit),
                              ...await Database.searchBooks(ctx.params.query, true, limit)])
                .distinct(book => book.id);
    
        if (limit)
            books = books.slice(0, limit);
    
        ctx.response.body = books.toArray();
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
        let limit = null;
        if (ctx.query.limit) limit = parseInt(limit);
    
        ctx.response.body = await Database.searchBooksByTitle(ctx.params.query, limit);
    }
    catch (err)
    {
        ctx.response.status = 500;
        ctx.response.body = err.message;
        logger.error(err);
    }
});

BookRouter.get("/checked_out", AuthWall, async ctx =>
{
    try
    {
        ctx.response.body = await Database.getCheckedOut(ctx.state.user.id);
    }
    catch (err)
    {
        ctx.response.status = 500;
        ctx.response.body = err.message;
        logger.error(err);
    }
});
import * as Router from "koa-router";
import { AuthWall } from "../auth";
import { Book, Database } from "../data";
import { Logger, LogSource } from "../util";
import { Linq } from "../util/linq";

const logger = new Logger(LogSource.Api);
export let BookRouter = new Router();

BookRouter.get("/isbn/:isbn", async ctx =>
{
    ctx.response.body = await Database.getBooksByIsbn(ctx.params.isbn);
});

BookRouter.get("/id/:id", async ctx =>
{
    ctx.response.body = await Database.getBookById(ctx.params.id);
});

BookRouter.get("/author/:id", async ctx =>
{
    ctx.response.body = await Database.getBooksByAuthor(ctx.params.id);
});

BookRouter.get("/title/:name", async ctx =>
{
    ctx.response.body = await Database.getBooksByTitle(ctx.params.name);
});

BookRouter.get("/search/:query", async ctx =>
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
});

BookRouter.get("/search/title/:query", async ctx =>
{
    let limit = null;
    if (ctx.query.limit) limit = parseInt(limit);
    
    ctx.response.body = await Database.searchBooksByTitle(ctx.params.query, limit);
});

BookRouter.get("/checked_out", AuthWall, async ctx =>
{
    ctx.response.body = await Database.getCheckedOut(ctx.state.user.id);
});

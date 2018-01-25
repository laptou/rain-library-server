import * as Router from "koa-router";
import { AuthWall } from "../auth";
import { Book, Database, Model } from "../data";
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

BookRouter.get("/status/:id", async ctx =>
{
    const checkout = await Database.getCheckedOut(ctx.state.user.id, ctx.params.id);

    if (checkout)
    {
        ctx.response.body = { status: "checked_out", checkout };
        return;
    }

    const book = await Database.getBookById(ctx.params.id);

    let holds = await Database.getHoldsForPerson(ctx.state.user.id);
    holds = holds.filter(h => h.isbn === book.isbn && !h.completed);

    if (holds.length > 0)
    {
        ctx.response.body = { status: "on_hold", hold: holds[0] };
        return;
    }

    ctx.response.body = { status: "none" };
});

BookRouter.post("/id/:id", AuthWall("modify_book"), async ctx =>
{
    const model = new Model.Book(ctx.body);
    await Database.saveBook(model);
    ctx.status = 200;
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
    
    if (ctx.query.limit) limit = parseInt(ctx.query.limit, 10);
    
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
    if (ctx.query.limit) limit = parseInt(limit, 10);
    
    ctx.response.body = await Database.searchBooksByTitle(ctx.params.query, limit);
});

BookRouter.get("/checked_out", AuthWall(), async ctx =>
{
    ctx.response.body = await Database.getCheckedOut(ctx.state.user.id);
});

import * as Router from "koa-router";
import * as Rx from "rxjs";
import { AuthWall } from "../auth";
import { Book, Database, Model, Hold } from "../data";
import { Logger, LogSource } from "../util";
import { Linq } from "../util/linq";

enum BookStatus
{
    None = "none",
    OnHold = "on_hold",
    CheckedOut = "checked_out",
    Overdue = "overdue",
    Unavailable = "unavailable"
}

const logger = new Logger(LogSource.Api);

export let BookRouter = new Router();
const isbnValidator = async (isbn, ctx, next) =>
{
    if (isbn.match(/^(\d{10}|\d{13})$/))
    {
        await next();
    }
};

BookRouter
    .param("isbn", isbnValidator)
    .get("/:isbn", async (ctx, next) =>
    {
        ctx.response.body = await Database.getBookByIsbn(ctx.params.isbn);
    })
    .post("/:isbn", AuthWall("modify_book"), ctx =>
    {
        const model = new Model.Book(ctx.body);
        return new Promise((resolve, reject) =>
        {
            model.save(null, (err) =>
            {
                if (err)
                {
                    ctx.status = 500;
                }

                ctx.status = 200;

                resolve();
            });
        });
    });

BookRouter
    .param("isbn", isbnValidator)
    .get("/status/checked_out", AuthWall(), async ctx =>
    {
        ctx.response.body = await Database.getCurrentCheckoutsForUser(ctx.state.user.id);
    })
    .get("/status/:isbn", AuthWall(), async ctx =>
    {
        const checkout = await Database.getCurrentCheckoutsForUser(ctx.state.user.id, ctx.params.isbn);

        if (checkout)
        {
            if (checkout.due < new Date())
                ctx.response.body = { status: BookStatus.Overdue, checkout };
            else
                ctx.response.body = { status: BookStatus.CheckedOut, checkout };
            return;
        }

        const holds = await Database.getPendingHoldsForBook((checkout.book as Book).isbn);
        const position = await Rx.Observable
            .from(holds)
            // use double-equals on purpose to coerce conversion of ObjectID to string
            // tslint:disable-next-line:triple-equals
            .findIndex((hold: Hold) => hold.person == ctx.state.user.id)
            .toPromise();

        if (position >= 0)
        {
            ctx.response.body = { status: BookStatus.OnHold, hold: holds[position], position };
            return;
        }

        ctx.response.body = { status: BookStatus.None };
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
        Rx.Observable.from([
            ...await Database.searchBooksByTitle(ctx.params.query, { populate: true, limit }),
            ...await Database.searchBooks(ctx.params.query, { populate: true, limit })])
            .distinct(book => book.id);

    if (limit)
        books = books.take(limit);

    ctx.response.body = await books.toArray().toPromise();
});

BookRouter.get("/search/title/:query", async ctx =>
{
    let limit = null;
    if (ctx.query.limit) limit = parseInt(limit, 10);

    ctx.response.body = await Database.searchBooksByTitle(ctx.params.query, { limit });
});

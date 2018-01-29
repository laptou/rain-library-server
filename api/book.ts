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

BookRouter.get("/:isbn", async ctx =>
{
    ctx.response.body = await Database.getBooksByIsbn(ctx.params.isbn);
});

BookRouter.get("/status/:isbn", async ctx =>
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

    const book = await Database.getBookById(ctx.params.id);
    const holds = await Database.getPendingHoldsForBook(book.isbn, false);
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
        Rx.Observable.from([
            ...await Database.searchBooksByTitle(ctx.params.query, true, limit),
            ...await Database.searchBooks(ctx.params.query, true, limit)])
            .distinct(book => book.id);

    if (limit)
        books = books.take(limit);

    ctx.response.body = await books.toArray().toPromise();
});

BookRouter.get("/search/title/:query", async ctx =>
{
    let limit = null;
    if (ctx.query.limit) limit = parseInt(limit, 10);

    ctx.response.body = await Database.searchBooksByTitle(ctx.params.query, limit);
});

BookRouter.get("/checked_out", AuthWall(), async ctx =>
{
    ctx.response.body = await Database.getCurrentCheckoutsForUser(ctx.state.user.id);
});

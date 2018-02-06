import * as Router from "koa-router";
import * as moment from "moment";
import * as Rx from "rxjs";

import { AuthWall } from "../auth";
import { Database, Hold, Model } from "../data";
import { Logger, LogSource } from "../util";
import * as validate from "./validate";

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

BookRouter
    .param("isbn", validate.Isbn)
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
    .param("id", validate.Id)
    .post("/:id/check_out", AuthWall("check_out"), async ctx =>
    {
        const user = await Database.getPersonById(ctx.body.user_id);
        if (!user)
        {
            ctx.status = 404;
            ctx.message = "User not found.";
            return;
        }

        const book = await Database.getBookById(ctx.params.id);
        if (!book)
        {
            ctx.status = 404;
            ctx.message = "Book not found.";
            return;
        }

        const checkout = new Model.Checkout({
            start: new Date(),
            due: moment().add(user.limits ? user.limits.days : 7, "days").toDate(),
            completed: false,
            penalty_factor: ctx.body.penalty_factor || 1,
            book: ctx.params.id,
            person: user.id
        });

        return new Promise((resolve, reject) =>
        {
            checkout.save(null, (err) =>
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
        const checkouts = await Database.getCurrentCheckoutsForUser(ctx.state.user.id, ctx.params.isbn);

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

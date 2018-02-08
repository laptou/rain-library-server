import * as Router from "koa-router";
import * as moment from "moment";
import { MongoError } from "mongodb";
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

BookRouter.param("isbn", validate.Isbn);
BookRouter.param("id", validate.Id);

BookRouter
    .get("/:isbn", async (ctx, next) =>
    {
        ctx.response.body = await Database.getBookByIsbn(ctx.params.isbn);
    })
    .post("/:isbn", AuthWall("modify_book"), ctx =>
    {
        if (!validate.Object(ctx.body, {
            name: "string",
            edition: { version: "number", publisher: "string" },
            authors: ["string"],
            copies: ["string"],
            genre: ["string"],
            rating: "number",
            isbn: "string",
        }))
        {
            ctx.status = 400;
            return;
        }

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
    .post("/:id/checkout",
    AuthWall("check_out"),
    validate.Middleware({
        user: "string",
        length: "number?",
        penalty: "number?"
    }),
    async ctx =>
    {
        const user = await Database.getPersonById(ctx.request.body.user);

        if (!user)
        {
            ctx.status = 404;
            ctx.message = "User not found.";
            return;
        }

        if (user.permissions.indexOf("user") === -1)
        {
            ctx.status = 403;
            ctx.message = "This user cannot borrow books.";
            return;
        }

        const checkouts = await Database.getCurrentCheckoutsForCopy(ctx.params.id, { populate: false });

        if (checkouts.length > 0)
        {
            ctx.status = 400;
            ctx.message = "This book has already been checked out.";
            return;
        }

        if (user.limits && user.limits.books)
        {

            if (user.limits.books <= checkouts.length)
            {
                ctx.status = 403;
                ctx.message = "Checkout limit has been reached.";
                return;
            }
        }

        const book = await Database.getBookByCopyId(ctx.params.id, { populate: false });

        if (!book)
        {
            ctx.status = 404;
            ctx.message = "Book not found.";
            return;
        }

        let length = ctx.request.body.length ? parseFloat(ctx.request.body.length) : Number.POSITIVE_INFINITY;
        length = Math.min(length, user.limits && user.limits.days ? user.limits.days : 7);

        const checkout = new Model.Checkout({
            start: new Date(),
            due: moment().add(length, "days").toDate(),
            completed: false,
            penalty: ctx.request.body.penalty || 1,
            copy: ctx.params.id,
            person: user.id
        });

        await new Promise((resolve, reject) =>
        {
            checkout.save(async (err: MongoError, res) =>
            {
                if (err)
                {
                    ctx.status = 500;
                }
                else
                {
                    ctx.status = 200;
                    ctx.body = res;
                }

                resolve();
            });
        });
    })
    .post("/:id/checkin",
    AuthWall("check_out"),
    validate.Middleware({
        user: "string",
    }),
    async ctx =>
    {
        // if the book was overdue, assess the fine
    });

BookRouter
    .get("/status/checkedout", AuthWall(), async ctx =>
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

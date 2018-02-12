import * as Router from "koa-router";
import * as moment from "moment";
import { MongoError } from "mongodb";
import * as Rx from "rxjs";

import { AuthWall } from "../auth";
import { Database, Model } from "../data";
import { Logger, LogSource } from "../util";
import * as validate from "./validate";

export enum BookStatus
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
        const book = await Database.getBookByIsbn(ctx.params.isbn);
        if (!book) ctx.status = 404;
        else ctx.response.body = book;
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
    .get("/all/checkedout",
        AuthWall("check_out"),
        async ctx =>
        {
            ctx.response.body = await Database.getCheckoutsSince(
                moment().subtract(ctx.query["days"] || 7, "day").toDate(),
                { populate: true });
        })
    .get("/all/fined",
        AuthWall("modify_fine"),
        async ctx =>
        {
            ctx.response.body = await Database.getFinesSince(
                moment().subtract(ctx.query["days"] || 7, "day").toDate(),
                { populate: true });
        });

BookRouter
    .get("/copy/:id", async (ctx, next) =>
    {
        const book = await Database.getBookByCopyId(ctx.params.id);
        if (!book) ctx.status = 404;
        else ctx.response.body = book;
    })
    .get("/copy/:id/checkout",
        AuthWall("check_out"),
        async ctx =>
        {
            const checkout = await Database.getCurrentCheckoutForCopy(ctx.params.id, { populate: true });
            if (!checkout) ctx.status = 404;
            else ctx.response.body = checkout;
        })

    .post("/copy/:id/checkout",
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

            if (user.permissions.includes("user"))
            {
                ctx.status = 403;
                ctx.message = "This user cannot borrow books.";
                return;
            }

            let checkout = await Database.getCurrentCheckoutForCopy(ctx.params.id, { populate: false });

            if (checkout)
            {
                ctx.status = 400;
                ctx.message = "This book has already been checked out.";
                return;
            }

            if (user.limits && user.limits.books)
            {
                const checkouts = await Database.getCurrentCheckoutsForPerson(user.id, null, { populate: false });

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

            let holds = await Database.getPendingHoldsForBook(book.isbn, { populate: false });
            holds = holds.filter(h => h.person.toString() === user.id);

            if (holds.length)
            {
                const hold = holds[0];
                hold.completed = true;
                await hold.save();
            }

            let length = ctx.request.body.length ? parseFloat(ctx.request.body.length) : Number.POSITIVE_INFINITY;
            if (user.limits && user.limits.days)
                length = Math.min(length, user.limits && user.limits.days ? user.limits.days : 7);

            checkout = new Model.Checkout({
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
    .post("/copy/:id/checkin",
        AuthWall("check_out"),
        async ctx =>
        {
            const checkout = await Database.getCurrentCheckoutForCopy(ctx.params.id, { populate: false });

            if (!checkout)
            {
                ctx.status = 400;
                ctx.message = "This book was not checked out.";
            }

            checkout.completed = true;
            checkout.end = new Date();

            if (checkout.end > checkout.due)
            {
                const days = Math.ceil(moment().diff(checkout.due, "days", true));

                // if the book was overdue, assess the fine
                const fine = new Model.Fine({
                    date: new Date(),
                    completed: false,
                    checkout,
                    copy: checkout.copy,
                    person: checkout.person,
                    amount: (days * checkout.penalty).toPrecision(2) // mongoose will
                    // convert string to decimal, but not js float to decimal -_-
                });

                await fine.save();
            }

            await checkout.save();

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

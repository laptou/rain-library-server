"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const moment = require("moment");
const Rx = require("rxjs");
const auth_1 = require("../auth");
const data_1 = require("../data");
const util_1 = require("../util");
const validate = require("./validate");
var BookStatus;
(function (BookStatus) {
    BookStatus["None"] = "none";
    BookStatus["OnHold"] = "on_hold";
    BookStatus["CheckedOut"] = "checked_out";
    BookStatus["Overdue"] = "overdue";
    BookStatus["Unavailable"] = "unavailable";
})(BookStatus = exports.BookStatus || (exports.BookStatus = {}));
const logger = new util_1.Logger(util_1.LogSource.Api);
exports.BookRouter = new Router();
exports.BookRouter.param("isbn", validate.Isbn);
exports.BookRouter.param("id", validate.Id);
exports.BookRouter
    .get("/:isbn", async (ctx, next) => {
    const book = await data_1.Database.getBookByIsbn(ctx.params.isbn);
    if (!book)
        ctx.status = 404;
    else
        ctx.response.body = book;
})
    .post("/:isbn", auth_1.AuthWall("modify_book"), ctx => {
    if (!validate.Object(ctx.body, {
        name: "string",
        edition: { version: "number", publisher: "string" },
        authors: ["string"],
        copies: ["string"],
        genre: ["string"],
        rating: "number",
        isbn: "string",
    })) {
        ctx.status = 400;
        return;
    }
    const model = new data_1.Model.Book(ctx.body);
    return new Promise((resolve, reject) => {
        model.save(null, (err) => {
            if (err) {
                ctx.status = 500;
            }
            ctx.status = 200;
            resolve();
        });
    });
});
exports.BookRouter
    .get("/copy/:id", async (ctx, next) => {
    const book = await data_1.Database.getBookByCopyId(ctx.params.id);
    if (!book)
        ctx.status = 404;
    else
        ctx.response.body = book;
})
    .get("/copy/:id/checkout", auth_1.AuthWall("check_out"), async (ctx) => {
    const checkout = await data_1.Database.getCurrentCheckoutForCopy(ctx.params.id, { populate: true });
    if (!checkout)
        ctx.status = 404;
    else
        ctx.response.body = checkout;
})
    .post("/copy/:id/checkout", auth_1.AuthWall("check_out"), validate.Middleware({
    user: "string",
    length: "number?",
    penalty: "number?"
}), async (ctx) => {
    const user = await data_1.Database.getPersonById(ctx.request.body.user);
    if (!user) {
        ctx.status = 404;
        ctx.message = "User not found.";
        return;
    }
    if (user.permissions.indexOf("user") === -1) {
        ctx.status = 403;
        ctx.message = "This user cannot borrow books.";
        return;
    }
    let checkout = await data_1.Database.getCurrentCheckoutForCopy(ctx.params.id, { populate: false });
    if (checkout) {
        ctx.status = 400;
        ctx.message = "This book has already been checked out.";
        return;
    }
    if (user.limits && user.limits.books) {
        const checkouts = await data_1.Database.getCurrentCheckoutsForUser(user.id, null, { populate: false });
        if (user.limits.books <= checkouts.length) {
            ctx.status = 403;
            ctx.message = "Checkout limit has been reached.";
            return;
        }
    }
    const book = await data_1.Database.getBookByCopyId(ctx.params.id, { populate: false });
    if (!book) {
        ctx.status = 404;
        ctx.message = "Book not found.";
        return;
    }
    let length = ctx.request.body.length ? parseFloat(ctx.request.body.length) : Number.POSITIVE_INFINITY;
    length = Math.min(length, user.limits && user.limits.days ? user.limits.days : 7);
    checkout = new data_1.Model.Checkout({
        start: new Date(),
        due: moment().add(length, "days").toDate(),
        completed: false,
        penalty: ctx.request.body.penalty || 1,
        copy: ctx.params.id,
        person: user.id
    });
    await new Promise((resolve, reject) => {
        checkout.save(async (err, res) => {
            if (err) {
                ctx.status = 500;
            }
            else {
                ctx.status = 200;
                ctx.body = res;
            }
            resolve();
        });
    });
})
    .post("/copy/:id/checkin", auth_1.AuthWall("check_out"), async (ctx) => {
    const checkout = await data_1.Database.getCurrentCheckoutForCopy(ctx.params.id, { populate: false });
    if (!checkout) {
        ctx.status = 400;
        ctx.message = "This book was not checked out.";
    }
    checkout.completed = true;
    checkout.end = new Date();
    if (checkout.end > checkout.due) {
        const days = Math.ceil(moment().diff(checkout.due, "days", true));
        // if the book was overdue, assess the fine
        const fine = new data_1.Model.Fine({
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
exports.BookRouter.get("/author/:id", async (ctx) => {
    ctx.response.body = await data_1.Database.getBooksByAuthor(ctx.params.id);
});
exports.BookRouter.get("/title/:name", async (ctx) => {
    ctx.response.body = await data_1.Database.getBooksByTitle(ctx.params.name);
});
exports.BookRouter.get("/search/:query", async (ctx) => {
    let limit = null;
    if (ctx.query.limit)
        limit = parseInt(ctx.query.limit, 10);
    let books = Rx.Observable.from([
        ...await data_1.Database.searchBooksByTitle(ctx.params.query, { populate: true, limit }),
        ...await data_1.Database.searchBooks(ctx.params.query, { populate: true, limit })
    ])
        .distinct(book => book.id);
    if (limit)
        books = books.take(limit);
    ctx.response.body = await books.toArray().toPromise();
});
exports.BookRouter.get("/search/title/:query", async (ctx) => {
    let limit = null;
    if (ctx.query.limit)
        limit = parseInt(limit, 10);
    ctx.response.body = await data_1.Database.searchBooksByTitle(ctx.params.query, { limit });
});
//# sourceMappingURL=book.js.map
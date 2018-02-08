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
    ctx.response.body = await data_1.Database.getBookByIsbn(ctx.params.isbn);
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
    .post("/:id/checkout", auth_1.AuthWall("check_out"), validate.Middleware({
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
    const checkouts = await data_1.Database.getCurrentCheckoutsForCopy(ctx.params.id, { populate: false });
    if (checkouts.length > 0) {
        ctx.status = 400;
        ctx.message = "This book has already been checked out.";
        return;
    }
    if (user.limits && user.limits.books) {
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
    const checkout = new data_1.Model.Checkout({
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
    .post("/:id/checkin", auth_1.AuthWall("check_out"), validate.Middleware({
    user: "string",
}), async (ctx) => {
    // if the book was overdue, assess the fine
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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const Rx = require("rxjs");
const auth_1 = require("../auth");
const data_1 = require("../data");
const util_1 = require("../util");
var BookStatus;
(function (BookStatus) {
    BookStatus["None"] = "none";
    BookStatus["OnHold"] = "on_hold";
    BookStatus["CheckedOut"] = "checked_out";
    BookStatus["Overdue"] = "overdue";
    BookStatus["Unavailable"] = "unavailable";
})(BookStatus || (BookStatus = {}));
const logger = new util_1.Logger(util_1.LogSource.Api);
exports.BookRouter = new Router();
exports.BookRouter.get("/isbn/:isbn", async (ctx) => {
    ctx.response.body = await data_1.Database.getBooksByIsbn(ctx.params.isbn);
});
exports.BookRouter.get("/id/:id", async (ctx) => {
    ctx.response.body = await data_1.Database.getBookById(ctx.params.id);
});
exports.BookRouter.get("/status/:id", async (ctx) => {
    const checkout = await data_1.Database.getCurrentCheckoutsForUser(ctx.state.user.id, ctx.params.id);
    if (checkout) {
        if (checkout.due < new Date())
            ctx.response.body = { status: BookStatus.Overdue, checkout };
        else
            ctx.response.body = { status: BookStatus.CheckedOut, checkout };
        return;
    }
    const book = await data_1.Database.getBookById(ctx.params.id);
    const holds = await data_1.Database.getPendingHoldsForBook(book.isbn, false);
    const position = await Rx.Observable
        .from(holds)
        .findIndex((hold) => hold.person == ctx.state.user.id)
        .toPromise();
    if (position >= 0) {
        ctx.response.body = { status: BookStatus.OnHold, hold: holds[position], position };
        return;
    }
    ctx.response.body = { status: BookStatus.None };
});
exports.BookRouter.post("/id/:id", auth_1.AuthWall("modify_book"), async (ctx) => {
    const model = new data_1.Model.Book(ctx.body);
    await data_1.Database.saveBook(model);
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
        ...await data_1.Database.searchBooksByTitle(ctx.params.query, true, limit),
        ...await data_1.Database.searchBooks(ctx.params.query, true, limit)
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
    ctx.response.body = await data_1.Database.searchBooksByTitle(ctx.params.query, limit);
});
exports.BookRouter.get("/checked_out", auth_1.AuthWall(), async (ctx) => {
    ctx.response.body = await data_1.Database.getCurrentCheckoutsForUser(ctx.state.user.id);
});
//# sourceMappingURL=book.js.map
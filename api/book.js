"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const auth_1 = require("../auth");
const data_1 = require("../data");
const util_1 = require("../util");
const linq_1 = require("../util/linq");
const logger = new util_1.Logger(util_1.LogSource.Api);
exports.BookRouter = new Router();
exports.BookRouter.get("/isbn/:isbn", async (ctx) => {
    ctx.response.body = await data_1.Database.getBooksByIsbn(ctx.params.isbn);
});
exports.BookRouter.get("/id/:id", async (ctx) => {
    ctx.response.body = await data_1.Database.getBookById(ctx.params.id);
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
        limit = parseInt(ctx.query.limit);
    let books = linq_1.Linq.array([...await data_1.Database.searchBooksByTitle(ctx.params.query, true, limit),
        ...await data_1.Database.searchBooks(ctx.params.query, true, limit)])
        .distinct(book => book.id);
    if (limit)
        books = books.slice(0, limit);
    ctx.response.body = books.toArray();
});
exports.BookRouter.get("/search/title/:query", async (ctx) => {
    let limit = null;
    if (ctx.query.limit)
        limit = parseInt(limit);
    ctx.response.body = await data_1.Database.searchBooksByTitle(ctx.params.query, limit);
});
exports.BookRouter.get("/checked_out", auth_1.AuthWall(), async (ctx) => {
    ctx.response.body = await data_1.Database.getCheckedOut(ctx.state.user.id);
});
exports.BookRouter.get("/checked_out/:id", auth_1.AuthWall(), async (ctx) => {
    ctx.response.body = (await data_1.Database.getCheckedOut(ctx.state.user.id, ctx.params.id)).length > 0;
});
//# sourceMappingURL=book.js.map
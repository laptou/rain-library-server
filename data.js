"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const config = require("./config");
const util_1 = require("./util");
mongoose.connect(config.db, { useMongoClient: true });
require("mongoose").Promise = Promise; // use require() to get rid of TS error
const dev = process.env.NODE_ENV === "development";
let conn = mongoose.connection;
let dbLogger = new util_1.Logger(util_1.LogSource.Database);
conn.on("error", err => {
    dbLogger.error("Failed to connect to database.");
    dbLogger.error(err);
});
conn.on("open", () => {
    dbLogger.info("Successfully connected to database.");
});
let schema = {
    Person: new mongoose.Schema({
        username: String,
        name: { first: String, last: String },
        permissions: [{ type: String }],
        password: String
    }),
    Book: new mongoose.Schema({
        name: String,
        editions: [{ version: Number, publisher: String }],
        authors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
        genre: [{ type: String }]
    }),
    Checkout: new mongoose.Schema({
        start: Date,
        end: Date,
        penalty_factor: Number,
        book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
        person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" }
    }),
    Hold: new mongoose.Schema({
        date: Date,
        completed: Boolean,
                                  isbn: { type: String },
        person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" }
    })
};
schema.Person.set("toJSON", { virtuals: true });
schema.Book.set("toJSON", { virtuals: true });
schema.Checkout.set("toJSON", { virtuals: true });
schema.Hold.set("toJSON", { virtuals: true });
exports.Model = {
    Person: mongoose.model("Person", schema.Person),
    Book: mongoose.model("Book", schema.Book),
    Hold: mongoose.model("Hold", schema.Hold),
    Checkout: mongoose.model("Checkout", schema.Checkout)
};
class Database {
    static async getBookById(id, populate = true) {
        let query = exports.Model.Book.findById(id);
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
    static async getBooksByAuthor(person, populate = true, limit) {
        if (typeof person === "string") {
            let query = exports.Model.Book.find({ authors: person });
            if (limit)
                query = query.limit(limit);
            if (populate)
                query = query.populate("authors");
            return await query;
        }
        else {
            let query = exports.Model.Book.find({ authors: person.id });
            if (limit)
                query = query.limit(limit);
            if (populate)
                query = query.populate("authors");
            return await query;
        }
    }
    static async getBooksByIsbn(isbn, populate = true) {
        let query = exports.Model.Book.find({ isbn });
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
    static async getBooksByTitle(title, populate = true) {
        let query = exports.Model.Book.find({ name: title }).collation({ locale: "en", strength: 1 });
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }

    static async getCheckedOut (userId, bookId)
    {
        let query = exports.Model.Checkout
            .find({
            person: userId,
            $or: [{ end: { $gte: new Date() } }, { end: null }]
                  });
        if (bookId)
        {
            query = exports.Model.Checkout
                           .find({
                                     person: userId,
                                     book: bookId,
                                     $or: [{ end: { $gte: new Date() } }, { end: null }]
                                 });
        }
        return await query.populate({
            path: "book",
            populate: { path: "authors" }
        });
    }
    static async getPersonById(id) {
        let query = exports.Model.Person.findById(id);
        return await query.exec();
    }
    static async getHoldsForBook(book, populate = true) {
        let query = exports.Model.Hold.find({ book: typeof book === "string" ? book : book.isbn });
        if (populate)
            query = query.populate("person");
        return await query.exec();
    }
    static async getHoldsForPerson(person, populate = true) {
        let query = exports.Model.Hold.find({ person: typeof person === "string" ? person : person.id });
        if (populate)
            query = query.populate("book");
        return await query.exec();
    }
    static async getPersonByUsername(name) {
        let query = exports.Model.Person.findOne({ "username": name }, null, { collation: { locale: "en", strength: 1 } });
        return await query.exec();
    }
    static async saveBook(book) {
        await new exports.Model.Book(book).save();
    }
    static async saveCheckout(checkout) {
        await new exports.Model.Checkout(checkout).save();
    }
    static async saveHold(hold) {
        await new exports.Model.Hold(hold).save();
    }
    static async savePerson(person) {
        await new exports.Model.Book(person).save();
    }
    static async searchBooks(search, populate = true, limit) {
        let query = exports.Model.Book.find({ $text: { $search: search } });
        if (limit)
            query = query.limit(limit);
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
    static async searchBooksByTitle(search, populate = true, limit) {
        let query = exports.Model.Book.find({ name: { $regex: `^${search}`, $options: "i" } });
        if (limit)
            query = query.limit(limit);
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
}
exports.Database = Database;
//# sourceMappingURL=data.js.map
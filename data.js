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
        book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
        person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" }
    })
};
schema.Person.set("toJSON", { virtuals: true });
schema.Book.set("toJSON", { virtuals: true });
schema.Checkout.set("toJSON", { virtuals: true });
schema.Hold.set("toJSON", { virtuals: true });
let Model = {
    Person: mongoose.model("Person", schema.Person),
    Book: mongoose.model("Book", schema.Book),
    Hold: mongoose.model("Hold", schema.Hold),
    Checkout: mongoose.model("Checkout", schema.Checkout)
};
class Database {
    static async addPerson(person) {
        await new Model.Book(person).save();
    }
    static async getBookById(id, populate = true) {
        let query = Model.Book.findById(id);
        return await query.exec();
    }
    static async getBooksByIsbn(isbn, populate = true) {
        let query = Model.Book.find({ isbn });
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
    static async getBooksByTitle(title, populate = true) {
        let query = Model.Book.find({ name: title }).collation({ locale: "en", strength: 1 });
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
    static async getCheckedOut(userId) {
        return await Model.Checkout
            .find({
            person: userId,
            $or: [{ end: { $gte: new Date() } }, { end: null }]
        })
            .populate({
            path: "book",
            populate: { path: "authors" }
        });
    }
    static async getPersonById(id) {
        let query = Model.Person.findById(id);
        return await query.exec();
    }
    static async getPersonByUsername(name) {
        let query = Model.Person.findOne({ "username": name }, null, { collation: { locale: "en", strength: 1 } });
        return await query.exec();
    }
    static async searchBooks(search, populate = true, limit) {
        let query = Model.Book.find({ $text: { $search: search } });
        if (limit)
            query = query.limit(limit);
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
    static async searchBooksByTitle(search, populate = true, limit) {
        let query = Model.Book.find({ name: { $regex: `^${search}`, $options: "i" } });
        if (limit)
            query = query.limit(limit);
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
}
Database.Model = Model;
exports.Database = Database;
//# sourceMappingURL=data.js.map
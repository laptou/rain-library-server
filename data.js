"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const config = require("./config");
const util_1 = require("./util");
mongoose.connect(config.db, { useMongoClient: true });
require("mongoose").Promise = Promise; // use require() to get rid of TS error
const dev = process.env.NODE_ENV === "development";
const conn = mongoose.connection;
const logger = new util_1.Logger(util_1.LogSource.Database);
conn.on("error", err => {
    logger.error("Failed to connect to database.");
    logger.error(err);
    if (dev)
        mongoose.connect("mongodb://localhost/library");
});
conn.on("open", () => {
    logger.info("Successfully connected to database.");
});
const schema = {
    Person: new mongoose.Schema({
        username: String,
        name: { first: String, last: String },
        permissions: [{ type: String }],
        password: String
    }, {
        toObject: { virtuals: true }, toJSON: {
            virtuals: true,
            transform: (doc, ret, options) => {
                delete ret.password;
                delete ret.__v;
            }
        }
    }),
    Book: new mongoose.Schema({
        name: String,
        editions: [{ version: Number, publisher: String }],
        copies: [mongoose.Schema.Types.ObjectId],
        authors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
        genre: [{ type: String }],
        isbn: String
    }, { toObject: { virtuals: true }, toJSON: { virtuals: true } }),
    Checkout: new mongoose.Schema({
        start: Date,
        due: Date,
        completed: Boolean,
        penalty_factor: Number,
        bookId: { type: mongoose.Schema.Types.ObjectId, alias: "book" },
        person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" }
    }, { toObject: { virtuals: true }, toJSON: { virtuals: true } }),
    Hold: new mongoose.Schema({
        date: Date,
        completed: Boolean,
        isbn: String,
        person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" }
    }, { toObject: { virtuals: true }, toJSON: { virtuals: true } }),
    Fine: new mongoose.Schema({
        date: Date,
        completed: Boolean,
        bookId: { type: mongoose.Schema.Types.ObjectId, alias: "book" },
        person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" },
        amount: mongoose.Schema.Types.Decimal128
    }, { toObject: { virtuals: true }, toJSON: { virtuals: true } })
};
schema.Checkout.virtual("book", {
    ref: "Book",
    localField: "book",
    foreignField: "copies"
});
schema.Fine.virtual("book", {
    ref: "Book",
    localField: "book",
    foreignField: "copies"
});
schema.Hold.virtual("book", {
    ref: "Book",
    localField: "isbn",
    foreignField: "isbn"
});
exports.Model = {
    Person: mongoose.model("Person", schema.Person),
    Book: mongoose.model("Book", schema.Book),
    Hold: mongoose.model("Hold", schema.Hold),
    Checkout: mongoose.model("Checkout", schema.Checkout)
};
class Database {
    static async getBookById(id, options) {
        return await Database.getBooks(exports.Model.Book.findById(id), options);
    }
    static async getBooksByAuthor(person, options) {
        return await Database.getBooks(exports.Model.Book.find({ authors: person }), options);
    }
    static async getBookByIsbn(isbn, options) {
        return await Database.getBooks(exports.Model.Book
            .findOne({ isbn }), options);
    }
    static async getBooksByTitle(title, options) {
        return await Database.getBooks(exports.Model.Book
            .find({ name: title })
            .collation({ locale: "en", strength: 1 }), options);
    }
    static async searchBooks(search, options) {
        return await Database.getBooks(exports.Model.Book.find({ $text: { $search: search } }), options);
    }
    static async searchBooksByTitle(search, options) {
        return await Database.getBooks(exports.Model.Book.find({ name: { $regex: `^${search}`, $options: "i" } }), options);
    }
    static async getCurrentCheckoutsForUser(userId, isbn, options) {
        if (isbn) {
            const book = await exports.Model.Book.findOne({ isbn });
            return await Database.getCheckouts(exports.Model.Checkout
                .find({
                completed: false,
                person: userId,
                book: { $in: book.copies }
            }), options);
        }
        return await Database.getCheckouts(exports.Model.Checkout
            .find({
            completed: false,
            person: userId
        }), options);
    }
    static async getCheckoutsForIsbn(isbn, options) {
        const book = await exports.Model.Book.findOne({ isbn });
        return await Database.getCheckouts(exports.Model.Checkout
            .find({
            book: { $in: book.copies }
        }), options);
    }
    //#endregion
    //#region people
    static async getPersonById(id) {
        const query = exports.Model.Person.findById(id);
        return await query.exec();
    }
    static async getPersonByUsername(name) {
        const query = exports.Model.Person.findOne({ username: name }, null, { collation: { locale: "en", strength: 1 } });
        return await query.exec();
    }
    //#endregion
    //#region holds
    static async getHoldById(id, options) {
        return await Database.getHolds(exports.Model.Hold
            .findById(id)
            .sort({ date: 1 }), options);
    }
    static async getHoldsForBook(isbn, options) {
        return await Database.getHolds(exports.Model.Hold
            .find({ isbn })
            .sort({ date: 1 }), options);
    }
    static async getPendingHoldsForBook(isbn, options) {
        return await Database.getHolds(exports.Model.Hold
            .find({ isbn, completed: false })
            .sort({ date: 1 }), options);
    }
    static async getHoldsForPerson(person, options) {
        return await Database.getHolds(exports.Model.Hold
            .find({
            person: typeof person === "string" ? person : person.id,
        }), options);
    }
    static async getPendingHoldsForPerson(person, options) {
        return await Database.getHolds(exports.Model.Hold
            .find({
            person: typeof person === "string" ? person : person.id,
            completed: false
        }), options);
    }
    static async getPendingHoldForPerson(person, isbn, options) {
        return await Database.getHolds(exports.Model.Hold
            .findOne({
            person: typeof person === "string" ? person : person.id,
            isbn,
            completed: false
        }), options);
    }
    static async getHolds(query, options) {
        if (options) {
            if (options.options)
                query = query.populate("person");
            if (options.limit)
                query = query.limit(options.limit);
        }
        return await query.exec();
    }
    static async getBooks(query, options) {
        if (options) {
            if (options.populate)
                query = query.populate("authors");
            if (options.limit)
                query = query.limit(options.limit);
        }
        return await query.exec();
    }
    static async getCheckouts(query, options) {
        if (options) {
            if (options.populate)
                query = query.populate({
                    path: "book",
                    populate: { path: "authors" }
                });
            if (options.limit)
                query = query.limit(options.limit);
        }
        return await query.exec();
    }
}
exports.Database = Database;
//# sourceMappingURL=data.js.map
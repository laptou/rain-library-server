import * as mongoose from "mongoose";
import * as config from "./config";
import { Logger, LogSource } from "./util";

mongoose.connect(config.db, { useMongoClient: true });
require("mongoose").Promise = Promise; // use require() to get rid of TS error

const dev = process.env.NODE_ENV === "development";

const conn = mongoose.connection;

const logger = new Logger(LogSource.Database);

conn.on("error", err =>
{
    logger.error("Failed to connect to database.");
    logger.error(err);

    if (dev) mongoose.connect("mongodb://localhost/library");
});

conn.on("open", () =>
{
    logger.info("Successfully connected to database.");
});

const schema = {
    Person: new mongoose.Schema(
        {
            username: String,
            name: { first: String, last: String },
            permissions: [{ type: String }],
            password: String
        }),
    Book: new mongoose.Schema(
        {
            name: String,
            editions: [{ version: Number, publisher: String }],
            authors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
            genre: [{ type: String }],
            isbn: String
        }),
    Checkout: new mongoose.Schema(
        {
            start: Date,
            due: Date,
            completed: Boolean,
            penalty_factor: Number,
            book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
            person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" }
        }),
    Hold: new mongoose.Schema(
        {
            date: Date,
            completed: Boolean,
            isbn: String,
            person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" }
        })
};

schema.Person.set("toJSON", {
    transform: (doc: Person, ret: Person, options: any) =>
    {
        delete ret.password;
        delete ret.__v;
    }
});

export let Model = {
    Person: mongoose.model<Person>("Person", schema.Person),
    Book: mongoose.model<Book>("Book", schema.Book),
    Hold: mongoose.model<Hold>("Hold", schema.Hold),
    Checkout: mongoose.model<Checkout>("Checkout", schema.Checkout)
};

export declare type Permission = "check_out" |
    "place_hold" |
    "modify_hold" |
    "modify_book" |
    "modify_fine" |
    "modify_person" |
    "admin" |
    "author" |
    "user" |
    "test";

export declare interface Person extends mongoose.Document
{
    username: string | null;
    name: { first: string, last: string };
    permissions: Permission[];
    password: string;
}

export declare interface Book extends mongoose.Document
{
    name: string;
    edition: { version: number, publisher: string };
    authors: Person[] | string[];
    genre: string[];
    rating: number;
    isbn: string;
}

export interface Checkout extends mongoose.Document
{
    start: Date;
    due: Date | null;
    completed: boolean;
    penalty_factor: number;
    book: string | Book;
    person: string | Person;
}

export interface Hold extends mongoose.Document
{
    date: Date;
    completed: boolean;
    isbn: string;
    person: string | Person;
}

export class Database
{
    static async getBookById(id: string, populate: boolean = true): Promise<Book>
    {
        let query = Model.Book.findById(id);

        if (populate)
            query = query.populate("authors");

        return await query.exec();
    }

    static async getBooksByAuthor(person: string | Person, populate = true, limit?: number)
    {
        if (typeof person === "string")
        {
            let query = Model.Book.find({ authors: person });

            if (limit)
                query = query.limit(limit);

            if (populate)
                query = query.populate("authors");

            return await query;
        }
        else
        {
            let query = Model.Book.find({ authors: person.id });

            if (limit)
                query = query.limit(limit);

            if (populate)
                query = query.populate("authors");

            return await query;
        }
    }

    static async getBooksByIsbn(isbn: string, populate: boolean = true): Promise<Book[]>
    {
        let query = Model.Book.find({ isbn });

        if (populate)
            query = query.populate("authors");

        return await query.exec() as Book[];
    }

    static async getBooksByTitle(title: string, populate: boolean = true): Promise<Book[]>
    {
        let query = Model.Book.find({ name: title }).collation({ locale: "en", strength: 1 });

        if (populate)
            query = query.populate("authors");

        return await query.exec();
    }

    static async getCurrentCheckoutsForUser(userId: string, bookId: string): Promise<Checkout>;
    static async getCurrentCheckoutsForUser(userId: string): Promise<Checkout[]>;
    static async getCurrentCheckoutsForUser(userId: string, bookId?: string): Promise<Checkout[] | Checkout>
    {
        let query: mongoose.DocumentQuery<Checkout[] | Checkout, Checkout> = Model.Checkout
            .find({
                person: userId,
                completed: false
            });

        if (bookId)
        {
            query = Model.Checkout
                .findOne({
                    person: userId,
                    book: bookId,
                    completed: false
                });
        }

        return await query.populate({
            path: "book",
            populate: { path: "authors" }
        });
    }

    static async getCheckoutsForIsbn(isbn: string): Promise<Checkout[]>
    {
        const bookIds = await Model.Book.find({ isbn }).select("_id");
        return await Model.Checkout.find({ completed: false, book: { $in: bookIds } });
    }

    static async getPersonById(id: string): Promise<Person>
    {
        const query = Model.Person.findById(id);

        return await query.exec();
    }

    static async getHoldById(id: string, populate = true): Promise<Hold>
    {
        let query = Model.Hold.findById(id);

        if (populate)
            query = query.populate("person");

        return await query.exec();
    }

    static async getHoldsForBook(book: string | Book, populate = true): Promise<Hold[]>
    {
        let query = Model.Hold
            .find({ isbn: typeof book === "string" ? book : book.isbn })
            .sort({ date: 1 });

        if (populate)
            query = query.populate("person");

        return await query.exec();
    }

    static async getPendingHoldsForBook(book: string | Book, populate = true): Promise<Hold[]>
    {
        let query = Model.Hold
            .find({ isbn: typeof book === "string" ? book : book.isbn, completed: false })
            .sort({ date: 1 });

        if (populate)
            query = query.populate("person");

        return await query.exec();
    }

    static async getHoldsForPerson(person: string | Person, populate = true): Promise<Hold[]>
    {
        let query = Model.Hold.find({ person: typeof person === "string" ? person : person.id });

        if (populate)
            query = query.populate("person");

        return await query.exec();
    }

    static async getPendingHoldsForPerson(person: string | Person, populate = true): Promise<Hold[]>
    {
        let query = Model.Hold.find({ person: typeof person === "string" ? person : person.id, completed: false });

        if (populate)
            query = query.populate("person");

        return await query.exec();
    }

    static async getPersonByUsername(name: string): Promise<Person>
    {
        const query = Model.Person.findOne({ username: name }, null,
            { collation: { locale: "en", strength: 1 } });

        return await query.exec();
    }

    static async saveBook(book: Book)
    {
        await new Model.Book(book).save();
    }

    static async saveCheckout(checkout: Checkout)
    {
        await new Model.Checkout(checkout).save();
    }

    static async saveHold(hold: Hold)
    {
        await new Model.Hold(hold).save();
    }

    static async savePerson(person: Person)
    {
        await new Model.Book(person).save();
    }

    static async searchBooks(search: string, populate: boolean = true, limit?: number): Promise<Book[]>
    {
        let query = Model.Book.find({ $text: { $search: search } });

        if (limit)
            query = query.limit(limit);

        if (populate)
            query = query.populate("authors");

        return await query.exec();
    }

    static async searchBooksByTitle(search: string, populate: boolean = true, limit?: number): Promise<Book[]>
    {
        let query = Model.Book.find({ name: { $regex: `^${search}`, $options: "i" } });

        if (limit)
            query = query.limit(limit);

        if (populate)
            query = query.populate("authors");

        return await query.exec();
    }
}

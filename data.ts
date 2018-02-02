import * as mongoose from "mongoose";

import * as config from "./config";
import { Logger, LogSource } from "./util";

require("mongoose").Promise = Promise; // use require() to get rid of TS error

const dev = process.env.NODE_ENV === "development";

const conn = mongoose.connection;

const logger = new Logger(LogSource.Database);

mongoose
    .connect(config.db, { useMongoClient: true })
    .catch(err => {
        logger.error("Database connection failed: " + err);
        if (dev) {
            mongoose.connect("mongodb://localhost/library");
            logger.info("Attempting to connect to localhost");
        }
    })
    .then(() => {
        logger.info("Successfully connected to database.");
    });

const schema = {
    Person: new mongoose.Schema(
        {
            username: String,
            name: { first: String, last: String },
            permissions: [{ type: String }],
            limits: { days: Number, books: Number },
            password: String,
            wiki: String,
            bio: String
        },
        {
            toObject: { virtuals: true },
            toJSON: {
                virtuals: true,
                transform: (doc: Person, ret: Person, options: any) => {
                    delete ret.password;
                    delete ret.__v;
                }
            }
        }
    ),
    Book: new mongoose.Schema(
        {
            name: String,
            editions: [{ version: Number, publisher: String }],
            copies: [mongoose.Schema.Types.ObjectId],
            authors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
            genre: [{ type: String }],
            isbn: String
        },
        { toObject: { virtuals: true }, toJSON: { virtuals: true } }
    ),
    Checkout: new mongoose.Schema(
        {
            start: Date,
            due: Date,
            completed: Boolean,
            penalty_factor: Number,
            bookId: { type: mongoose.Schema.Types.ObjectId, alias: "book" },
            person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" }
        },
        { toObject: { virtuals: true }, toJSON: { virtuals: true } }
    ),
    Hold: new mongoose.Schema(
        {
            date: Date,
            completed: Boolean,
            isbn: String,
            person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" }
        },
        { toObject: { virtuals: true }, toJSON: { virtuals: true } }
    ),
    Fine: new mongoose.Schema(
        {
            date: Date,
            completed: Boolean,
            bookId: { type: mongoose.Schema.Types.ObjectId, alias: "book" },
            person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" },
            amount: mongoose.Schema.Types.Decimal128
        },
        { toObject: { virtuals: true }, toJSON: { virtuals: true } }
    )
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

export let Model = {
    Person: mongoose.model<Person>("Person", schema.Person),
    Book: mongoose.model<Book>("Book", schema.Book),
    Hold: mongoose.model<Hold>("Hold", schema.Hold),
    Checkout: mongoose.model<Checkout>("Checkout", schema.Checkout)
};

export declare type Permission =
    | "check_out"
    | "place_hold"
    | "modify_hold"
    | "modify_book"
    | "modify_fine"
    | "modify_person"
    | "admin"
    | "author"
    | "user"
    | "test";

export declare interface Person extends mongoose.Document {
    username: string | null;
    name: { first: string; last: string };
    permissions: Permission[];
    password: string;
}

export declare interface Book extends mongoose.Document {
    name: string;
    edition: { version: number; publisher: string };
    authors: Person[] | string[];
    copies: string[];
    genre: string[];
    rating: number;
    isbn: string;
}

export interface Checkout extends mongoose.Document {
    start: Date;
    due: Date | null;
    completed: boolean;
    penalty_factor: number;
    book: string | Book;
    person: string | Person;
}

export interface Hold extends mongoose.Document {
    date: Date;
    completed: boolean;
    isbn: string;
    person: string | Person;
}

export interface Fine extends mongoose.Document {
    date: Date;
    completed: boolean;
    amount: number;
    book: string | Book;
    person: string | Person;
}

export interface QueryOptions {
    populate?: boolean;
    limit?: number;
}

export class Database {
    static async getBookById(
        id: string,
        options?: QueryOptions
    ): Promise<Book> {
        return await Database.getBooks(Model.Book.findById(id), options);
    }

    static async getBooksByAuthor(person: string, options?: QueryOptions) {
        return await Database.getBooks(
            Model.Book.find({ authors: person }),
            options
        );
    }

    static async getBookByIsbn(
        isbn: string,
        options?: QueryOptions
    ): Promise<Book> {
        return await Database.getBooks(Model.Book.findOne({ isbn }), options);
    }

    static async getBooksByTitle(
        title: string,
        options?: QueryOptions
    ): Promise<Book[]> {
        return await Database.getBooks(
            Model.Book.find({ name: title }).collation({
                locale: "en",
                strength: 1
            }),
            options
        );
    }

    static async searchBooks(
        search: string,
        options?: QueryOptions
    ): Promise<Book[]> {
        return await Database.getBooks(
            Model.Book.find({ $text: { $search: search } }),
            options
        );
    }

    static async searchPeople(
        search: string,
        options?: QueryOptions
    ): Promise<Person[]> {
        return (await Model.Person.aggregate([
            {
                $addFields: {
                    "name.full": { $concat: ["$name.first", " ", "$name.last"] }
                }
            },
            { $match: { "name.full": { $regex: `^${search}`, $options: "i" } } }
        ])).map(o => new Model.Person(o));
    }

    static async searchBooksByTitle(
        search: string,
        options?: QueryOptions
    ): Promise<Book[]> {
        return await Database.getBooks(
            Model.Book.find({ name: { $regex: `^${search}`, $options: "i" } }),
            options
        );
    }

    //#region checkouts

    static async getCurrentCheckoutsForUser(
        userId: string,
        isbn?: string,
        options?: QueryOptions
    ): Promise<Checkout[]> {
        if (isbn) {
            const book = await Model.Book.findOne({ isbn });
            return await Database.getCheckouts(
                Model.Checkout.find({
                    completed: false,
                    person: userId,
                    book: { $in: book.copies }
                }),
                options
            );
        }

        return await Database.getCheckouts(
            Model.Checkout.find({
                completed: false,
                person: userId
            }),
            options
        );
    }

    static async getCheckoutsForIsbn(
        isbn: string,
        options?: QueryOptions
    ): Promise<Checkout[]> {
        const book = await Model.Book.findOne({ isbn });
        return await Database.getCheckouts(
            Model.Checkout.find({
                book: { $in: book.copies }
            }),
            options
        );
    }

    //#endregion

    //#region people

    static async getPersonById(id: string): Promise<Person> {
        const query = Model.Person.findById(id);

        return await query.exec();
    }

    static async getPersonByUsername(name: string): Promise<Person> {
        const query = Model.Person.findOne({ username: name }, null, {
            collation: { locale: "en", strength: 1 }
        });

        return await query.exec();
    }

    //#endregion

    //#region holds

    static async getHoldById(
        id: string,
        options?: QueryOptions
    ): Promise<Hold> {
        return await Database.getHolds(
            Model.Hold.findById(id).sort({ date: 1 }),
            options
        );
    }

    static async getHoldsForBook(
        isbn: string,
        options?: QueryOptions
    ): Promise<Hold[]> {
        return await Database.getHolds(
            Model.Hold.find({ isbn }).sort({ date: 1 }),
            options
        );
    }

    static async getPendingHoldsForBook(
        isbn: string,
        options?: QueryOptions
    ): Promise<Hold[]> {
        return await Database.getHolds(
            Model.Hold.find({ isbn, completed: false }).sort({ date: 1 }),
            options
        );
    }

    static async getHoldsForPerson(
        person: string | Person,
        options?: QueryOptions
    ): Promise<Hold[]> {
        return await Database.getHolds(
            Model.Hold.find({
                person: typeof person === "string" ? person : person.id
            }),
            options
        );
    }

    static async getPendingHoldsForPerson(
        person: string | Person,
        options?: QueryOptions
    ): Promise<Hold[]> {
        return await Database.getHolds(
            Model.Hold.find({
                person: typeof person === "string" ? person : person.id,
                completed: false
            }),
            options
        );
    }

    static async getPendingHoldForPerson(
        person: string | Person,
        isbn: string,
        options?: QueryOptions
    ): Promise<Hold> {
        return await Database.getHolds(
            Model.Hold.findOne({
                person: typeof person === "string" ? person : person.id,
                isbn,
                completed: false
            }),
            options
        );
    }

    //#endregion

    private static async getHolds(
        query: mongoose.DocumentQuery<Hold[], Hold>,
        options
    ): Promise<Hold[]>;
    private static async getHolds(
        query: mongoose.DocumentQuery<Hold, Hold>,
        options
    ): Promise<Hold>;
    private static async getHolds(
        query: mongoose.DocumentQuery<Hold[] | Hold, Hold>,
        options
    ) {
        // populate by default
        if (!options || (options && options.populate))
            query = query.populate("person");

        if (options && options.limit) query = query.limit(options.limit);

        return await query.exec();
    }

    private static async getBooks(
        query: mongoose.DocumentQuery<Book[], Book>,
        options
    ): Promise<Book[]>;
    private static async getBooks(
        query: mongoose.DocumentQuery<Book, Book>,
        options
    ): Promise<Book>;
    private static async getBooks(
        query: mongoose.DocumentQuery<Book[] | Book, Book>,
        options
    ) {
        // populate by default
        if (!options || (options && options.populate))
            query = query.populate("authors");

        if (options && options.limit) query = query.limit(options.limit);

        return await query.exec();
    }

    private static async getPeople(
        query: mongoose.DocumentQuery<Person[], Person>,
        options
    ): Promise<Person[]>;
    private static async getPeople(
        query: mongoose.DocumentQuery<Person, Person>,
        options
    ): Promise<Person>;
    private static async getPeople(
        query: mongoose.DocumentQuery<Person[] | Person, Person>,
        options
    ) {
        if (options && options.limit) query = query.limit(options.limit);

        return await query.exec();
    }

    private static async getCheckouts(
        query: mongoose.DocumentQuery<Checkout[], Checkout>,
        options
    ): Promise<Checkout[]>;
    private static async getCheckouts(
        query: mongoose.DocumentQuery<Checkout, Checkout>,
        options
    ): Promise<Checkout>;
    private static async getCheckouts(
        query: mongoose.DocumentQuery<Checkout[] | Checkout, Checkout>,
        options
    ) {
        if (!options || (options && options.populate))
            query = query.populate({
                path: "book",
                populate: { path: "authors" }
            });

        if (options && options.limit) query = query.limit(options.limit);

        return await query.exec();
    }
}

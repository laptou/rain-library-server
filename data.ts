import * as mongoose from "mongoose";

import * as config from "./config";
import { Logger, LogSource } from "./util";

require("mongoose").Promise = Promise; // use require() to get rid of TS error

const dev = process.env.NODE_ENV === "development";

const conn = mongoose.connection;

const logger = new Logger(LogSource.Database);

const connect = (async () => {
    let target = config.db;

    while (true) {
        try {
            logger.info("Attempting to connect to database.");
            await mongoose.connect(target);
            logger.info("Successfully connected to database.");
            break;
        }
        catch (err) {
            logger.error("Database connection failed: " + err);

            if (target !== "mongodb://localhost/library")
                target = "mongodb://localhost/library";
            else
                target = config.db;

            logger.info("Attempting to connect to " + target);
        }
    }

    conn.once("error", connect);
});

connect();

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
            end: Date,
            completed: Boolean,
            penalty: Number,
            copy: mongoose.Schema.Types.ObjectId,
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
            copy: mongoose.Schema.Types.ObjectId,
            checkout: { type: mongoose.Schema.Types.ObjectId, ref: "Checkout" },
            person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" },
            amount: mongoose.Schema.Types.Decimal128
        },
        { toObject: { virtuals: true }, toJSON: { virtuals: true } }
    )
};

schema.Checkout.virtual("book", {
    ref: "Book",
    localField: "copy",
    foreignField: "copies",
    justOne: true
});

schema.Fine.virtual("book", {
    ref: "Book",
    localField: "copy",
    foreignField: "copies",
    justOne: true
});

schema.Hold.virtual("book", {
    ref: "Book",
    localField: "isbn",
    foreignField: "isbn",
    justOne: true
});

export let Model = {
    Person: mongoose.model<Person>("Person", schema.Person),
    Book: mongoose.model<Book>("Book", schema.Book),
    Hold: mongoose.model<Hold>("Hold", schema.Hold),
    Fine: mongoose.model<Fine>("Fine", schema.Fine),
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
    limits: { books: number; days: number; } | null;
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
    end: Date | null;
    completed: boolean;
    penalty: number;
    book: Book;
    copy: string;
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
    book: Book;
    copy: string;
    person: string | Person;
}

export interface QueryOptions {
    populate?: boolean;
    limit?: number;
}

export class Database {
    public static getCurrentFinesForPerson(
        person: string,
        options?: QueryOptions
    ): mongoose.Query<Fine[]> {
        return Model.Fine
            .find({
                person,
                completed: false
            })
            .populate("checkout")
            .populate("person")
            .populate("book");
    }

    public static async getFinesForPerson(
        person: string,
        options?: QueryOptions
    ): Promise<Fine[]> {
        return Model.Fine
            .find({ person })
            .populate("checkout")
            .populate("person")
            .populate("book");
    }

    public static async getFinesSince(
        date: Date,
        options?: QueryOptions
    ): Promise<Fine[]> {
        return Model.Fine
            .find({
                date: { $gte: date }
            })
            .populate("checkout")
            .populate("person")
            .populate("book");
    }

    public static async getBookById(
        id: string,
        options?: QueryOptions
    ): Promise<Book> {
        return Database.getBooks(Model.Book.findById(id), options);
    }

    public static async getBookByCopyId(
        copyId: string,
        options?: QueryOptions
    ): Promise<Book> {
        return Database.getBooks(Model.Book.findOne({ copies: copyId }), options);
    }

    public static async getBooksByAuthor(person: string, options?: QueryOptions) {
        return Database.getBooks(
            Model.Book.find({ authors: person }),
            options
        );
    }

    public static async getBookByIsbn(
        isbn: string,
        options?: QueryOptions
    ): Promise<Book> {
        return Database.getBooks(Model.Book.findOne({ isbn }), options);
    }

    public static async getBooksByTitle(
        title: string,
        options?: QueryOptions
    ): Promise<Book[]> {
        return Database.getBooks(
            Model.Book.find({ name: title }).collation({
                locale: "en",
                strength: 1
            }),
            options
        );
    }

    public static async searchBooks(
        search: string,
        options?: QueryOptions
    ): Promise<Book[]> {
        return Database.getBooks(
            Model.Book.find({ $text: { $search: search } }),
            options
        );
    }

    public static async searchPeople(
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

    public static async searchBooksByTitle(
        search: string,
        options?: QueryOptions
    ): Promise<Book[]> {
        return Database.getBooks(
            Model.Book.find({ name: { $regex: `^${search}`, $options: "i" } }),
            options
        );
    }

    //#region checkouts

    public static async getCurrentCheckoutsForPerson(
        userId: string,
        isbn?: string,
        options?: QueryOptions
    ): Promise<Checkout[]> {
        if (isbn) {
            const book = await Model.Book.findOne({ isbn });
            return Database.getCheckouts(
                Model.Checkout.find({
                    completed: false,
                    person: userId,
                    copy: { $in: book.copies }
                }),
                options
            );
        }

        return Database.getCheckouts(
            Model.Checkout.find({
                completed: false,
                person: userId
            }),
            options
        );
    }

    public static async getCheckoutsForPerson(
        userId: string,
        isbn?: string,
        options?: QueryOptions
    ): Promise<Checkout[]> {
        if (isbn) {
            const book = await Model.Book.findOne({ isbn });
            return Database.getCheckouts(
                Model.Checkout.find({
                    person: userId,
                    copy: { $in: book.copies }
                }),
                options
            );
        }

        return Database.getCheckouts(
            Model.Checkout.find({
                person: userId
            }),
            options
        );
    }

    public static async getCurrentCheckoutForCopy(
        copyId: string,
        options?: QueryOptions
    ): Promise<Checkout> {
        return Database.getCheckouts(
            Model.Checkout.findOne({
                completed: false,
                copy: copyId
            }),
            options
        );
    }

    public static async getCheckoutsSince(
        date: Date,
        options?: QueryOptions
    ): Promise<Checkout[]> {
        return Database.getCheckouts(
            Model.Checkout.find({
                start: { $gte: date }
            }),
            options
        );
    }

    public static async getCheckoutsForIsbn(
        isbn: string,
        options?: QueryOptions
    ): Promise<Checkout[]> {
        const book = await Model.Book.findOne({ isbn });
        return Database.getCheckouts(
            Model.Checkout.find({
                book: { $in: book.copies }
            }),
            options
        );
    }

    //#endregion

    //#region people

    public static async getPersonById(id: string): Promise<Person> {
        const query = Model.Person.findById(id);

        return query.exec();
    }

    public static async getPersonByUsername(name: string): Promise<Person> {
        const query = Model.Person.findOne({ username: name }, null, {
            collation: { locale: "en", strength: 1 }
        });

        return query.exec();
    }

    //#endregion

    //#region holds

    public static async getHoldById(
        id: string,
        options?: QueryOptions
    ): Promise<Hold> {
        return Database.getHolds(
            Model.Hold.findById(id).sort({ date: 1 }),
            options
        );
    }

    public static async getHoldsForBook(
        isbn: string,
        options?: QueryOptions
    ): Promise<Hold[]> {
        return Database.getHolds(
            Model.Hold.find({ isbn }).sort({ date: 1 }),
            options
        );
    }

    public static async getPendingHoldsForBook(
        isbn: string,
        options?: QueryOptions
    ): Promise<Hold[]> {
        return Database.getHolds(
            Model.Hold.find({ isbn, completed: false }).sort({ date: 1 }),
            options
        );
    }

    public static async getHoldsForPerson(
        person: string | Person,
        options?: QueryOptions
    ): Promise<Hold[]> {
        return Database.getHolds(
            Model.Hold.find({
                person: typeof person === "string" ? person : person.id
            }),
            options
        );
    }

    public static async getPendingHoldsForPerson(
        person: string | Person,
        options?: QueryOptions
    ): Promise<Hold[]> {
        return Database.getHolds(
            Model.Hold.find({
                person: typeof person === "string" ? person : person.id,
                completed: false
            }),
            options
        );
    }

    public static async getPendingHoldForPerson(
        person: string | Person,
        isbn: string,
        options?: QueryOptions
    ): Promise<Hold> {
        return Database.getHolds(
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
        if (!options || (options && options.populate)) {
            query = query
                .populate("person", "name id username")
                .populate({ path: "book", populate: { path: "authors", select: "name id username" } });
        }

        if (options && options.limit) query = query.limit(options.limit);

        return query.exec();
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

        return query.exec();
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

        return query.exec();
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

        // must explicitly be set to true to do full population
        if (options && options.populate === true)
            query = query.populate({
                path: "person"
            });

        if (options && options.limit) query = query.limit(options.limit);

        return query.exec();
    }
}

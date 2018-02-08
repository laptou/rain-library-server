(() =>
{
    db = db.getSiblingDB("library");
    db.createCollection("checkouts");
    db.createCollection("holds");
    db.createCollection("people");
    db.createCollection("books");
    db.createCollection("fines");

    let trace = (operation, result) =>
    {
        if (result.ok)
        {
            print(`${operation}: OK`);
        }
        else if (result instanceof WriteResult)
        {
            print(`${operation}: OK, modified ${result.nModified}, inserted ${result.nUpserted} records of ${result.nMatched} matched`);
        }
        else
        {
            print(`${operation}: Failed - ${result.codeName} - ${result.errmsg}`);
        }
    };

    trace(
        "Updating schema for fines",
        db.runCommand({
            collMod: "fines",
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["date", "copy", "person", "completed", "amount", "checkout"],
                    properties: {
                        date: { bsonType: "date" },
                        copy: { bsonType: "objectId" },
                        checkout: { bsonType: "objectId" },
                        person: { bsonType: "objectId" },
                        completed: { bsonType: "bool" },
                        amount: { bsonType: "decimal" }
                    }
                }
            }
        })
    );

    trace(
        "Updating schema for holds",
        db.runCommand({
            collMod: "holds",
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["date", "isbn", "person", "completed"],
                    properties: {
                        date: { bsonType: "date" },
                        isbn: { bsonType: "string" },
                        person: { bsonType: "objectId" },
                        completed: { bsonType: "bool" }
                    }
                }
            }
        })
    );

    trace(
        "Updating schema for checkouts",
        db.runCommand({
            collMod: "checkouts",
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: [
                        "start",
                        "due",
                        "completed",
                        "penalty",
                        "copy",
                        "person",
                    ],
                    properties: {
                        start: { bsonType: "date" },
                        due: { bsonType: "date" },
                        end: { bsonType: "date" },
                        completed: { bsonType: "bool" },
                        penalty: { type: "number" },
                        copy: { bsonType: "objectId" },
                        person: { bsonType: "objectId" }
                    }
                }
            }
        })
    );

    trace(
        "Updating schema for books",
        db.runCommand({
            collMod: "books",
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["isbn", "name", "authors", "year", "genre"],
                    properties: {
                        name: { bsonType: "string" },
                        isbn: { bsonType: "string", pattern: "^[0-9]{13}$" },
                        year: { bsonType: "int" },
                        genre: {
                            bsonType: "array",
                            items: {
                                bsonType: "string",
                                enum: [
                                    "mystery",
                                    "horror",
                                    "egg",
                                    "history",
                                    "adventure",
                                    "romance",
                                    "young-adult",
                                    "thriller",
                                    "action",
                                    "adult",
                                    "child",
                                    "erotica",
                                    "test"
                                ]
                            },
                            uniqueItems: true,
                            minItems: 1
                        },
                        authors: {
                            bsonType: "array",
                            items: { bsonType: "objectId" },
                            uniqueItems: true,
                            minItems: 1
                        },
                        edition: {
                            bsonType: "object",
                            required: ["version", "publisher"],
                            properties: {
                                version: { bsonType: "int" },
                                publisher: { bsonType: "string" }
                            }
                        },
                        copies: {
                            bsonType: "array",
                            items: { bsonType: "objectId" },
                            uniqueItems: true,
                            minItems: 1
                        },
                        versions: {
                            bsonType: "array",
                            items: { bsonType: "string", pattern: "^[0-9]{13}$" },
                            uniqueItems: true
                        },
                        rating: { bsonType: "double" },
                        ratingCount: { bsonType: "int" },
                        location: {
                            bsonType: "object",
                            properties: {
                                site: { bsonType: "string" },
                                section: { bsonType: "string" },
                                shelf: { bsonType: "string" }
                            }
                        }
                    }
                }
            }
        })
    );

    trace(
        "Updating schema for people",
        db.runCommand({
            collMod: "people",
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["name", "permissions"],
                    properties: {
                        username: { bsonType: "string" },
                        limits: {
                            bsonType: "object",
                            properties: {
                                days: { bsonType: "int" },
                                books: { bsonType: "int" }
                            }
                        },
                        name: {
                            bsonType: "object",
                            required: ["first", "last"],
                            properties: {
                                first: { bsonType: "string" },
                                last: { bsonType: "string" }
                            }
                        },
                        password: { bsonType: "string" },
                        permissions: {
                            bsonType: "array",
                            items: {
                                bsonType: "string",
                                enum: [
                                    "check_out",
                                    "place_hold",
                                    "modify_hold",
                                    "modify_book",
                                    "modify_fine",
                                    "modify_person",
                                    "admin",
                                    "author",
                                    "user",
                                    "test"
                                ]
                            },
                            uniqueItems: true
                        },
                        bio: { bsonType: "string" },
                        wiki: {
                            bsonType: "string",
                            pattern:
                                "^(https?://)?([A-Za-z]{2}|simple).wikipedia.org/wiki/[^#<>{}[]|]+$"
                        }
                    }
                }
            }
        })
    );

    trace(
        "Updating username index for people",
        db.people.createIndex(
            { username: 1 },
            {
                unique: true,
                partialFilterExpression: { username: { $exists: true } },
                name: "Username",
                collation: { locale: "en", strength: 1 }
            }
        )
    );

    trace(
        "Updating name index for people",
        db.people.createIndex(
            { "name.first": 1, "name.last": 1 },
            { name: "Full Name", collation: { locale: "en", strength: 1 } }
        )
    );

    trace(
        "Updating collated name index for books",
        db.books.createIndex(
            { name: 1 },
            { name: "Name (Collated)", collation: { locale: "en", strength: 1 } }
        )
    );
    trace("Updating FTS name index for books", db.books.createIndex({ name: "text" }, { name: "Name (FTS)" }));
    trace("Updating ISBN index for books", db.books.createIndex({ isbn: 1 }, { name: "ISBN", unique: true }));
    trace("Updating ID index for books", db.books.createIndex({ copies: 1 }, { name: "IDs", unique: true }));

    trace("Updating ISBN index for holds", db.holds.createIndex({ isbn: 1 }, { name: "ISBN" }));
    trace("Updating person ID index for holds", db.holds.createIndex({ person: 1 }, { name: "Person" }));

    trace(
        "Updating book-person-amount index for fines",
        db.fines.createIndex(
            { book: 1, person: 1, amount: 1 },
            { name: "Book-Person-Amount" }
        )
    );

    trace("Updating book ID index for checkouts", db.checkouts.createIndex({ copy: 1 }, { name: "Book" }));
    trace("Updating date index for checkouts", db.checkouts.createIndex({ start: 1, due: 1 }, { name: "Date" }));
    trace("Updating person ID index for checkouts", db.checkouts.createIndex({ person: 1 }, { name: "Person" }));

    trace(
        "Inserting Alexandre Dumas sample",
        db.people.update(
            { _id: ObjectId("5a400a88da662e0ec88f88f3") },
            {
                name: { first: "Alexandre", last: "Dumas" },
                permissions: ["author"]
            },
            { upsert: true }
        )
    );

    trace(
        "Inserting reeraa sample",
        db.people.update(
            { _id: ObjectId("5a5624d00408d33ed0c28ce4") },
            {
                password:
                    "$2a$12$pRcEPIMwrwj9D81xSvU.vO98GLOy607GIFdmJvaeXAO03OviEkRcu",
                username: "rEeraa",
                permissions: ["user", "place_hold", "admin"],
                name: { first: "ree", last: "raa" }
            },
            { upsert: true }
        )
    );

    trace(
        "Inserting The Count of Monte Cristo sample",
        db.books.update(
            { _id: ObjectId("5a400cf0da662e0ec88f88f4") },
            {
                name: "The Count of Monte Cristo",
                editions: [
                    { publisher: "Heehee Publishing", version: NumberInt(3) }
                ],
                authors: [ObjectId("5a400a88da662e0ec88f88f3")],
                genre: ["mystery", "egg"],
                copies: [ObjectId("5a5d01168a45aa1d1688609b")],
                year: NumberInt(1845),
                isbn: "9780553213508"
            },
            { upsert: true }
        )
    );

    trace(
        "Inserting checkout sample",
        db.checkouts.update(
            { _id: ObjectId("5a5d01168a45aa1d1688609c") },
            {
                start: ISODate("2018-01-11T00:00:00Z"),
                penalty: 4,
                completed: false,
                due: ISODate("2018-02-11T22:05:00Z"),
                book: ObjectId("5a5d01168a45aa1d1688609b"),
                person: ObjectId("5a5624d00408d33ed0c28ce4")
            },
            { upsert: true }
        )
    );

    trace(
        "Inserting hold sample",
        db.holds.update(
            { _id: ObjectId("5a5d01168a45ba1d1688609d") },
            {
                date: ISODate("2018-01-11T00:00:00Z"),
                completed: false,
                isbn: "9780553213508",
                person: ObjectId("5a598571f206d2259c0edb7a")
            },
            { upsert: true }
        )
    );

    print("done");
})();
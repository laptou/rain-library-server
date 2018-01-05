printjson(db.runCommand(
    {
        "collMod": "books",
        "validator": {
            "$jsonSchema": {
                bsonType: "object",
                required: ["isbn", "name", "authors", "year"],
                properties: {

                    name: { bsonType: "string" },
                    isbn: { bsonType: "string", pattern: "^[0-9]{13}$" },
                    year: { bsonType: "int" },
                    genre: {
                        bsonType: "array",
                        items: {
                            bsonType: "string",
                            enum: ["mystery",
                                   "horror",
                                   "egg",
                                   "adventure",
                                   "romance",
                                   "young-adult",
                                   "thriller",
                                   "action",
                                   "adult",
                                   "child",
                                   "erotica"]
                        }
                    },
                    authors: { bsonType: "array", items: { bsonType: "objectId" } },
                    editions: {
                        bsonType: "array",
                        items: {
                            bsonType: "object",
                            required: ["version", "publisher"],
                            properties: {
                                version: { bsonType: "int" },
                                publisher: { bsonType: "string" }
                            }
                        }
                    }
                }
            }
        }
    }));

printjson(db.runCommand(
    {
        "collMod": "people",
        "validator": {
            "$jsonSchema": {
                bsonType: "object",
                required: ["name", "permissions"],
                properties: {
                    username: { bsonType: "string" },
                    name: {
                        bsonType: "object",
                        required: ["first", "last"],
                        properties: {
                            first: { bsonType: "string" },
                            last: { bsonType: "string" }
                        }
                    },
                    password: {
                        bsonType: "string"
                    },
                    permissions: {
                        bsonType: "array",
                        items: {
                            bsonType: "string",
                            enum: ["check_out",
                                   "place_hold",
                                   "modify_hold",
                                   "modify_book",
                                   "modify_fine",
                                   "modify_person",
                                   "admin",
                                   "author",
                                   "user"]
                        }
                    }
                }
            }
        }
    }));

printjson(db.people.createIndex({ "username": 1 },
                                {
                                    unique: true,
                                    partialFilterExpression: { username: { $exists: true } },
                                    name: "Username",
                                    collation: { locale: "en", strength: 1 }
                                }));
printjson(db.people.createIndex({ "name.first": 1, "name.last": 1 },
                                { name: "Full Name", collation: { locale: "en", strength: 1 } }));

printjson(db.books.createIndex({ "name": 1 }, { name: "Name (Collated)", collation: { locale: "en", strength: 1 } }));
printjson(db.books.createIndex({ "name": "text" }, { name: "Name (FTS)" }));

printjson(db.people.update({ _id: ObjectId("5a400a88da662e0ec88f88f3") },
                           {
                               name: { first: "Alexandre", last: "Dumas" },
                               permissions: ["author"]
                           },
                           { upsert: true }));

printjson(db.books.update({ "_id": ObjectId("5a400cf0da662e0ec88f88f4") },
                          {
                              name: "The Count of Monte Cristo",
                              editions: [{ "publisher": "Heehee Publishing", "version": NumberInt(3) }],
                              authors: [ObjectId("5a400a88da662e0ec88f88f3")],
                              genre: ["mystery", "egg"],
                              year: NumberInt(1845),
                              isbn: "9780553213508"
                          },
                          { upsert: true }));
print("done");
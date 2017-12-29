var conn = new Mongo();
var db = conn.getDB("library");

db.runCommand(
    {
        "collMod": "books",
        "validator":
            {
                "$jsonSchema":
                    {
                        bsonType: "object",
                        required: ["isbn", "name", "authors"],
                        properties:
                            {
                                name:
                                    {
                                        bsonType: "string",
                                        description: "must be a string and is required"
                                    },
                                isbn: {
                                    bsonType: "string",
                                    pattern: "^[0-9]{13}$"
                                },
                                genre:
                                    {
                                        bsonType: "array",
                                        description: "must be an array and is not required",
                                        items:
                                            {
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
                                authors:
                                    {
                                        bsonType: "array",
                                        items:
                                            {
                                                bsonType: "objectId"
                                            }
                                    },
                                editions:
                                    {
                                        bsonType: "array",
                                        items:
                                            {
                                                bsonType: "object",
                                                required: ["version", "publisher"],
                                                properties:
                                                    {
                                                        version:
                                                            {
                                                                bsonType: "int"
                                                            },
                                                        publisher:
                                                            {
                                                                bsonType: "string"
                                                            }
                                                    }
                                            }
                                    }
                            }
                    }
            }
    });
db.runCommand(
    {
        "collMod": "people",
        "validator":
            {
                "$jsonSchema":
                    {
                        bsonType: "object",
                        required: ["name"],
                        properties:
                            {
                                name:
                                    {
                                        bsonType: "object",
                                        required: ["first", "last"],
                                        properties:
                                            {
                                                first:
                                                    {
                                                        bsonType: "string"
                                                    },
                                                last:
                                                    {
                                                        bsonType: "string"
                                                    }
                                            }
                                    }
                            }
                    }
            }
    });

db.people.createIndex({ "name.first": "text", "name.last": "text" });
db.books.createIndex({ "name": "text" });
db.people.update(
    {
        "_id": ObjectId("5a400a88da662e0ec88f88f3")
    },
    {
        "name":
            {
                "first": "Alexandre",
                "last": "Dumas"
            }
    },
    {
        upsert: true
    });
db.books.update(
    {
        "_id": ObjectId("5a400cf0da662e0ec88f88f4")
    },
    {
        "name": "The Count of Monte Cristo",
        "edition": [
            {
                "publisher": "Heehee Publishing",
                "version": 3
            }],
        "authors": [ObjectId("5a400a88da662e0ec88f88f3")],
        "genre": ["mystery"],
        isbn: "9780553213508"
    },
    {
        upsert: true
    });

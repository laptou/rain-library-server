export let db;
if (process.env.NODE_ENV === "development")
    db = "mongodb://192.168.2.221/library";
else
    db = "mongodb://localhost/library";

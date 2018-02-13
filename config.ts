export let db;
if (true || process.env.NODE_ENV === "development")
    db = "mongodb://192.168.3.173/library";
// else
// db = "mongodb://localhost/library";

export let flags = { ssl: false, ssl_redirect: false, http2: false, api_only: false };

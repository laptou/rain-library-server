"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (true || process.env.NODE_ENV === "development")
    exports.db = "mongodb://192.168.3.173/library";
// else
// db = "mongodb://localhost/library";
exports.flags = { ssl: false, ssl_redirect: false, http2: false, api_only: false };
//# sourceMappingURL=config.js.map
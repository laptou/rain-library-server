"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (process.env.NODE_ENV === "development")
    exports.db = "mongodb://192.168.3.173/library";
// else
exports.db = "mongodb://localhost/library";
//# sourceMappingURL=config.js.map
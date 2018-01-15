"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
class Logger {
    constructor(source) {
        this.source = source;
        switch (source) {
            case LogSource.Server:
                this.colors = {
                    tag: chalk_1.default.cyanBright.bold,
                    log: chalk_1.default.grey,
                    info: chalk_1.default.cyan,
                    warn: chalk_1.default.yellow,
                    error: chalk_1.default.redBright.bold
                };
                break;
            case LogSource.Webpack:
                this.colors = {
                    tag: chalk_1.default.grey.bold,
                    log: chalk_1.default.grey,
                    info: chalk_1.default.white,
                    warn: chalk_1.default.yellow,
                    error: chalk_1.default.redBright.bold
                };
                break;
            case LogSource.Api:
                this.colors = {
                    tag: chalk_1.default.green.bold,
                    log: chalk_1.default.grey,
                    info: chalk_1.default.green,
                    warn: chalk_1.default.yellow,
                    error: chalk_1.default.redBright.bold
                };
                break;
            case LogSource.Database:
                this.colors = {
                    tag: chalk_1.default.greenBright.bold,
                    log: chalk_1.default.grey,
                    info: chalk_1.default.greenBright,
                    warn: chalk_1.default.yellow,
                    error: chalk_1.default.redBright.bold
                };
                break;
            case LogSource.Auth:
                this.colors = {
                    tag: chalk_1.default.magentaBright.bold,
                    log: chalk_1.default.grey,
                    info: chalk_1.default.magenta,
                    warn: chalk_1.default.yellow,
                    error: chalk_1.default.redBright.bold
                };
                break;
        }
    }
    error(a, ...b) {
        this.write(LogSeverity.Error, a, ...b);
    }
    info(a, ...b) { this.write(LogSeverity.Info, a, ...b); }
    log(a, ...b) { this.write(LogSeverity.Log, a, ...b); }
    warn(a, ...b) { this.write(LogSeverity.Warning, a, ...b); }
    write(severity, a, ...b) {
        if (a instanceof Error)
            a = a.stack;
        switch (severity) {
            case LogSeverity.Log:
                console.log(this.colors.tag(`[${this.source.toUpperCase()}] `) + this.colors.log(a, ...b));
                break;
            case LogSeverity.Info:
                console.log(this.colors.tag(`[${this.source.toUpperCase()}] `) + this.colors.info(a, ...b));
                break;
            case LogSeverity.Warning:
                console.log(this.colors.tag(`[${this.source.toUpperCase()}] `) + this.colors.warn(a, ...b));
                break;
            case LogSeverity.Error:
                console.log(this.colors.tag(`[${this.source.toUpperCase()}] `) + this.colors.error(a, ...b));
                break;
        }
    }
}
exports.Logger = Logger;
var LogSource;
(function (LogSource) {
    LogSource["Auth"] = "auth";
    LogSource["Webpack"] = "webpack";
    LogSource["Api"] = "api";
    LogSource["Server"] = "server";
    LogSource["Database"] = "db";
})(LogSource = exports.LogSource || (exports.LogSource = {}));
var LogSeverity;
(function (LogSeverity) {
    LogSeverity[LogSeverity["Error"] = 0] = "Error";
    LogSeverity[LogSeverity["Warning"] = 1] = "Warning";
    LogSeverity[LogSeverity["Info"] = 2] = "Info";
    LogSeverity[LogSeverity["Log"] = 3] = "Log";
})(LogSeverity = exports.LogSeverity || (exports.LogSeverity = {}));
class Async {
    static promise(func, a1) {
        return new Promise((resolve, reject) => {
            func(a1, (err, result) => {
                if (err)
                    reject(err);
                resolve(result);
            });
        });
    }
}
exports.Async = Async;
function acceptsJson(ctx) {
    let types = ctx.headers["accept"].split(",").map(t => t.trim());
    return types.indexOf("application/json") !== -1;
}
exports.acceptsJson = acceptsJson;
//# sourceMappingURL=index.js.map
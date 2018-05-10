import { Context } from "koa";
import { IMiddleware } from "koa-router";

export const Isbn = async (isbn, ctx, next) => {
    if (isbn.match(/^\d{13}|\d{10}$/)) {
        await next();
    }
};

export const Id = async (id, ctx, next) => {
    if (id.match(/^[a-f0-9]{24}$/)) {
        await next();
    }
};

export const Object = (obj: any, properties: any) => {
    if (obj === undefined || obj === null)
        return false;

    const validate = (o, t) => {
        if (t === undefined || t === null)
            return false;

        if (t instanceof Array) {
            if (t.length === 1) {
                // [string] means array of strings
                if (o instanceof Array)
                    o.every(_ => validate(_, t[0]));
                else return false;
            }
            else if (!t.some(_ => validate(o, _)))
                return false;
        }

        if (typeof t === "string")
            if (!t.endsWith("?") && typeof o !== t)
                return false;

        if (typeof t === "function" && o.prototype !== t)
            return false;

        if (typeof t === "object")
            return Object(o, t);

        return true;
    };

    for (const prop in properties) {
        if (!properties.hasOwnProperty(prop)) continue;

        if (!obj.hasOwnProperty(prop)) {
            if (prop.endsWith("?") || typeof properties[prop] === "string" && properties[prop].endsWith("?"))
                continue;
            else
                return false;
        }

        const type = properties[prop];

        if (!validate(obj[prop], type))
            return false;
    }

    return true;
};

export const Middleware = (properties: any): IMiddleware => {
    return async (ctx: Context, next) => {
        if (!Object(ctx.request.body, properties)) {
            ctx.status = 400;
            return;
        }

        await next();
    };
};

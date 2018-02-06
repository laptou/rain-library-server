export const Isbn = async (isbn, ctx, next) =>
{
    if (isbn.match(/^\d{10}|\d{13}$/))
    {
        await next();
    }
};

export const Id = async (id, ctx, next) =>
{
    if (id.match(/^[a-f0-9]{20}$/))
    {
        await next();
    }
};

export const Object = (obj: any, properties: any) =>
{
    const validate = (o, t) =>
    {
        if (t instanceof Array)
        {
            if (t.length === 1)
            {
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

    for (const prop in obj)
    {
        if (!obj.hasOwnProperty(prop)) continue;

        if (!properties.hasOwnProperty(prop)) return false;

        const type = properties[prop];

        if (!validate(obj[prop], type))
            return false;
    }

    return true;
};

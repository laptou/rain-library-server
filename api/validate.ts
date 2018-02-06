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

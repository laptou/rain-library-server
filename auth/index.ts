import * as bcrypt from "bcrypt";
import * as KoaPassport from "koa-passport";
import * as Router from "koa-router";
import { IMiddleware } from "koa-router";

import { Strategy as LocalStrategy } from "passport-local";

import { Database, Person } from "../data";
import { acceptsJson, Logger, LogSource } from "../util";

const logger = new Logger(LogSource.Auth);

KoaPassport.serializeUser((user: Person, done) =>
                          {
                              done(null, { id: user.id, name: user.name, username: user.username });
                          });

KoaPassport.deserializeUser(async (user: { id: string }, done) =>
                            {
                                const doc = await Database.getPersonById(user.id);
                                done(null, doc);
                            });

KoaPassport.use("local-register", new LocalStrategy(
    { passReqToCallback: true },
    async (req, username, password, done) =>
    {
        try
        {
            let person = await Database.getPersonByUsername(username);
            let valid = true;
    
            if (person)
            {
                done(null, null, { message: "User with this name already exists." });
                valid = false;
            }
    
            let first = req.body.name.first || req.body.firstName;
            let last = req.body.name.last || req.body.lastName;
    
            if (!first || !last)
            {
                done(null, null, { message: "First and last name are required to create a new user." });
                valid = false;
            }
    
            if (valid)
            {
    
                let hash = await bcrypt.hash(password, await bcrypt.genSalt(12));
    
                person = new Database.Model.Person();
                person.username = username;
                person.name = { first, last };
                person.permissions = ["user"];
                person.password = hash;
                await person.save({ safe: true });
    
                done(null, person, { message: "User created." });
            }
        }
        catch (err)
        {
            done(err);
        }
    }));

KoaPassport.use("local-login", new LocalStrategy(
    { passReqToCallback: true },
    async (req, username, password, done) =>
    {
        try
        {
            let person = await Database.getPersonByUsername(username);
            
            if (person)
            {
                if (person.permissions.indexOf("user") === -1)
                {
                    done(null, null, { message: "This person does not have the required permissions. " });
                    return;
                }
                
                if (await bcrypt.compare(password, person.password))
                {
                    done(null, person, { message: "User authenticated." });
                    return;
                }
            }
            
            done(null, null, { message: "Invalid username or password." });
        }
        catch (err)
        {
            done(err);
        }
    }));

export const AuthRouter = new Router();
export const AuthWall: IMiddleware = async function (ctx, next)
{
    if (ctx.isUnauthenticated())
        if (acceptsJson(ctx))
            ctx.throw(401);
        else
            ctx.redirect("/");
    else await next();
};

AuthRouter.get("/me", AuthWall, async ctx =>
{
    const user: Person = ctx.state.user;
    ctx.body = { id: user.id, name: user.name, username: user.username };
});

AuthRouter.get("/logout", AuthWall, async ctx =>
{
    ctx.logout();
    ctx.status = 200;
});

AuthRouter.post("/register", KoaPassport.authenticate("local-register"),
                async ctx =>
                {
                    // if it gets here, that means it got past Passport
                    ctx.status = 200;
                });

AuthRouter.post("/login", KoaPassport.authenticate("local-login"),
                async ctx =>
                {
                    // if it gets here, that means it got past Passport
                    ctx.status = 200;
                });

// AuthRouter.post("*", );
import * as bcrypt from "bcrypt";
import * as KoaPassport from "koa-passport";
import * as Router from "koa-router";

import { Strategy as LocalStrategy } from "passport-local";

import { Database } from "../data";

KoaPassport.serializeUser((user: any, done) =>
                          {
                              done(null, user.id);
                          });

KoaPassport.deserializeUser((id: string, done) =>
                            {
                                done(null, Database.getPersonById(id));
                            });

KoaPassport.use("local-register", new LocalStrategy(
    {
        passwordField: "password",
        usernameField: "username",
        passReqToCallback: true
    },
    async (req, username, password, done) =>
    {
        try
        {
            let first;
            let last;
            
            if (req.body.name && req.body.name.first && req.body.name.last)
            {
                first = req.body.name.first;
                last = req.body.name.last;
            }
            else
            {
                done(null, null, { message: "First and last name are required to create a new user." });
                return;
            }
            
            let salt = await bcrypt.genSalt(12);
            let hash = await bcrypt.hash(password, salt);
            
            let person = new Database.Model.Person();
            person.name = { full: username, first, last };
            person.permissions = ["user"];
            person.password = { hash, salt };
            await person.save({ safe: true });
            
            done(null, person, { message: "User created." });
        }
        catch (err)
        {
            done(err);
        }
    }));

export const AuthRouter = new Router();
AuthRouter.post("/register", async ctx =>
{
    // await Database.addPerson({ permissions: ["ree"], name: { first: "Lol", last: "Lolius " } });
});

AuthRouter.post("/login", KoaPassport.authenticate("local-register", {}));
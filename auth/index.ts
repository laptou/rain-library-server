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
            
            let first;
            let last;
    
            if (req.body.firstName && req.body.lastName)
            {
                first = req.body.firstName;
                last = req.body.lastName;
    
                if (first + " " + last !== username)
                {
                    done(null, null, { message: "Username must be the first name and last name concatenated." });
                    valid = false;
                }
            }
            else
            {
                done(null, null, { message: "First and last name are required to create a new user." });
                valid = false;
            }
    
            if (valid)
            {
        
                let hash = await bcrypt.hash(password, await bcrypt.genSalt(12));
        
                person = new Database.Model.Person();
                person.name = { full: username, first, last };
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
AuthRouter.post("/register", KoaPassport.authenticate("local-register"));

AuthRouter.post("/login", KoaPassport.authenticate("local-login"));
import { Chalk, default as chalk } from "chalk";

export class Logger
{
    private colors: {
        tag: Chalk,
        error: Chalk,
        info: Chalk,
        warn: Chalk,
        log: Chalk
    };
    
    private source: LogSource;
    
    constructor (source: LogSource)
    {
        this.source = source;
        switch (source)
        {
            case LogSource.Server:
                this.colors = {
                    tag: chalk.cyanBright.bold,
                    log: chalk.grey,
                    info: chalk.cyan,
                    warn: chalk.yellow,
                    error: chalk.redBright.bold
                };
                break;
            case LogSource.Webpack:
                this.colors = {
                    tag: chalk.grey.bold,
                    log: chalk.grey,
                    info: chalk.white,
                    warn: chalk.yellow,
                    error: chalk.redBright.bold
                };
                break;
            case LogSource.Api:
                this.colors = {
                    tag: chalk.green.bold,
                    log: chalk.grey,
                    info: chalk.green,
                    warn: chalk.yellow,
                    error: chalk.redBright.bold
                };
                break;
            case LogSource.Database:
                this.colors = {
                    tag: chalk.greenBright.bold,
                    log: chalk.grey,
                    info: chalk.greenBright,
                    warn: chalk.yellow,
                    error: chalk.redBright.bold
                };
                break;
        }
    }
    
    err (a: any, ... b: any[]) { this.write(LogSeverity.Error, a, ... b); }
    
    info (a: any, ... b: any[]) { this.write(LogSeverity.Info, a, ... b); }
    
    log (a: any, ... b: any[]) { this.write(LogSeverity.Log, a, ... b); }
    
    warn (a: any, ... b: any[]) { this.write(LogSeverity.Warning, a, ... b); }
    
    write (severity: LogSeverity, a: any, ... b: any[])
    {
        switch (severity)
        {
            case LogSeverity.Log:
                console.log(this.colors.tag(`[${this.source.toUpperCase()}] `) + this.colors.log(a, ... b));
                break;
            case LogSeverity.Info:
                console.log(this.colors.tag(`[${this.source.toUpperCase()}] `) + this.colors.info(a, ... b));
                break;
            case LogSeverity.Warning:
                console.log(this.colors.tag(`[${this.source.toUpperCase()}] `) + this.colors.warn(a, ... b));
                break;
            case LogSeverity.Error:
                console.log(this.colors.tag(`[${this.source.toUpperCase()}] `) + this.colors.error(a, ... b));
                break;
        }
    }
}

export enum LogSource
{
    Webpack = "webpack",
    Api = "api",
    Server = "server",
    Database = "db"
}

export enum LogSeverity
{
    Error,
    Warning,
    Info,
    Log
}

export abstract class Async
{
    public static promise<T> (func: (a1, cb: (err, result: T) => void) => any, a1): Promise<T>
    {
        return new Promise((resolve, reject) =>
                           {
                               func(a1, (err, result) =>
                               {
                                   if (err) reject(err);
                                   resolve(result);
                               });
                           });
    }
}
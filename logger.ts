import * as os from 'os'
import * as email from 'email'
import * as db from 'mongo'

export const INFO = 'INFO'
export const WARN = 'WARN'
export const ERROR = 'ERROR'
export const FATAL = 'FATAL'

export async function log(error: Error | string, severity: string = ERROR) {
    //Return if input is bad
    if (!error || Array.isArray(error) || typeof error === 'number') return

    //Prepare log entry
    const entry = {
        date: new Date(),
        severity: severity,
        hostname: os.hostname(),
        message: null,
        stack: null
    }

    if (typeof error === 'string') entry.message = error
    else {
        entry.message = error.message
        entry.stack = error.stack
    }

    //Insert log entry into the DB
    try { await db.insertOne('log', entry) }
    catch(err) {
        console.error(`Fatal: Failed to write log entry to database: ${err.message}`)
        process.exit(1)
    }

    //If severe then we should try to email the alert to the support team
    /*
    if ((severity === exports.ERROR || severity === exports.FATAL) && !error.email && config.alerts && config.alerts.length && email.ready()) {
        //console.error(entry)
        let msg = `Server: ${os.hostname}<br>`
        msg += JSON.stringify(error)
        try {
            await email.send({
                from: "NPAS Alerts <noreply@citi.com>",
                to: config.alerts.join(','),
                subject: `NetApp Provisioning API Server Encountered Error Severity: ${severity}`,
                html: msg
            })
        }
        //Do nothing if there is an error sending alert email
        catch(err) {}
    }*/

    //If severe then also write to console stderr
    if (severity === ERROR || severity === FATAL) {
        console.error(entry)
    }

    //Terminate if severity is FATAL
    if (entry.severity === FATAL) {
        process.exit(2)
    }
}

//Remediate NodeJS Error object to allow JSON stringify
if (!('toJSON' in Error.prototype))
Object.defineProperty(Error.prototype, 'toJSON', {
    value: function () {
        var alt = {}

        Object.getOwnPropertyNames(this).forEach(function (key) {
            alt[key] = this[key]
        }, this)

        return alt
    },
    configurable: true,
    writable: true
})

//Catch globally uncaught exceptions and rejected promises
process
.on('unhandledRejection', (reason: Error, p: Promise<any>) => {
    log(reason, FATAL)
})
.on('uncaughtException', (err: Error) => {
    log(err, FATAL)
})

log('Server started', INFO)

//Periodically delete log entries older than 30 days
setInterval(() => {
    const dt = new Date()
    dt.setDate(dt.getDate() - 30)
    db.deleteMany('log', {date: {$lt: dt}})
}, 3600000) //run every hour

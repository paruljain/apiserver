import * as https from 'https'
import { IncomingMessage, ServerResponse } from 'http'
import * as fs from 'fs'
import * as querystring from 'querystring'
import * as url from 'url'
import * as logger from 'logger'

interface Callback {
    (req: IncomingMessage, res: ServerResponse): void | Promise<void>
}

interface Route {
    method: string
    path: string
    callback: Callback
}

declare module 'http' {
    interface ServerResponse {
        json(body: any, code?: number): void
        error(message: string, code?: number): void
        html(htmlBody: string): void
        send(code: number): void
        redirect(location: string): void
    }
    interface IncomingMessage {
        body: string
        params: any
        query: any
        json: any
        token: any
    }
}

const routes: Route[] = []

ServerResponse.prototype.json = function(body: any, code?: number): void {
    this.statusCode = code || 200
    this.setHeader('Content-Type', 'application/json')
    this.setHeader('Access-Control-Allow-Origin', '*')
    let b: string
    try { b = JSON.stringify(body) }
    catch(err) {
        this.statusCode = 500
        this.end(JSON.stringify({'error': err.message}))
        logger.log('res.json: Failed to strigify body: ' + err.message, logger.ERROR)
        return
    }
    this.write(b)
    this.end()
}

ServerResponse.prototype.error = function(message: string, code?: number): void {
    code = code || 500
    this.json({message}, code)
    if (code >= 500 && code <=599) {
        // log the error to logger if there is a system error
        logger.log(message, logger.ERROR)
    }
}

ServerResponse.prototype.send = function(code: number): void {
    this.statusCode = code
    this.setHeader('Access-Control-Allow-Origin', '*')
    this.end()
}

ServerResponse.prototype.html = function(htmlBody: string): void {
    this.statusCode = 200
    this.setHeader('Content-Type', 'text/html')
    this.setHeader('Access-Control-Allow-Origin', '*')
    this.write(htmlBody)
    this.end()
}

ServerResponse.prototype.redirect = function(location: string): void {
    this.writeHead(301, {
        Location: location
    })
    this.end()
}

function router(req: IncomingMessage, res: ServerResponse) {

    // handle CORS pre-flight request
    if (req.method === 'OPTIONS') {
        // CORS Support
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Max-Age': '86400' // 24 hours
        })
        return res.end()
    }

    // Grab query string if any
    req.query = {}
    const parts = req.url.split('?')
    if (parts.length === 2) req.query = querystring.parse(parts[1])

    let body: Uint8Array[] = []
    req.on('error', err => logger.log(err, logger.ERROR))
    req.on('data', chunk => body.push(chunk))
    req.on('end', () => {
        req.body = Buffer.concat(body).toString()
        req.json = {}
        if (body && /^application\/json/i.test(req.headers["content-type"])) {
            try { req.json = JSON.parse(req.body) }
            catch(err) { return res.error('Body is not proper JSON', 400) }
        }

        // routing
        let u: url.UrlWithStringQuery
        try { u = url.parse(req.url) }
        catch(err) { return res.error(err.message, 400) }

        let routeMatch: Route
        for (const route of routes) {
            if (route.method === req.method) {
                // Match each element and load :param variables in params
                const pathElements = u.pathname.split('/').map(p => decodeURIComponent(p))
                const routeElements = route.path.split('/')
                let matchFailed = false
                const params = {}
                for (let i=0; i<pathElements.length; i++) {
                    if (i === routeElements.length) {matchFailed = true; break}
                    if (routeElements[i].startsWith(':')) params[routeElements[i].slice(1)] = pathElements[i]
                    else if (routeElements[i] === '*') break
                    else if (routeElements[i] !== pathElements[i]) {matchFailed = true; break}
                }
                if (!matchFailed) {
                    req.params = params
                    routeMatch = route
                    break
                }
            }
        }
        if (!routeMatch) return res.send(404)
        // the callback can be sync or async. The error catching is different for each
        try {
            const obj = routeMatch.callback(req, res)
            if (obj && Promise.resolve(obj) === obj) { // is the callback async?
                obj
                .catch(err => { // handle error for async callback
                    res.error(err.message, 500)
                })
            }
        }
        catch(err) { //handle error for sync callback
            res.error(err.message, 500)
        }
    })
}

export function addRoute(method: string, path: string, callback: Callback) {
    routes.push({method: method.toUpperCase(), path: path, callback: callback})
}

export function get(path: string, callback: Callback) {
    addRoute('GET', path, callback)
}

export function post(path: string, callback: Callback) {
    addRoute('POST', path, callback)
}

export function put(path: string, callback: Callback) {
    addRoute('PUT', path, callback)
}

export function del(path: string, callback: Callback) {
    addRoute('DELETE', path, callback)
}

const port = parseInt(process.env['SERVER_PORT']) || 443
const server = https.createServer({
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.cert')
}, router)
server.timeout = 600000
server.on('error', err => logger.log(err, logger.FATAL))
server.listen(port)

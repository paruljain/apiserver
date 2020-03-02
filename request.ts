process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import * as https from 'https'
import * as http from 'http'
import * as url from 'url'

export interface Request {
    url: string
    method?: string
    data?: string
    headers?: any
}

export interface Response {
    statusCode: number
    statusMessage: string
    body: string
    headers: any
}

export function execute(options: Request): Promise<Response> {
    return new Promise((resolve, reject) => {
        if (!options) return reject(new Error('options must be provided'))
        if (!options.url) return reject(new Error('options.url must be provided'))
        options.method = options.method || 'GET'
        options.method = options.method.toUpperCase()
    
        let parsedUrl: url.UrlWithStringQuery
        try {parsedUrl = url.parse(options.url)}
        catch(err) { return reject(err) }
       
        let path = parsedUrl.pathname
        if (parsedUrl.search) path += parsedUrl.search
        let port: number
        if (!parsedUrl.port) {
            if (parsedUrl.protocol.toLowerCase() === 'http:') port = 80
            else if (parsedUrl.protocol.toLowerCase() === 'https:') port = 443
        }
        else port = parseInt(parsedUrl.port)
        const opt: https.RequestOptions = {
            host: parsedUrl.hostname,
            port: port,
            path: path,
            method: options.method,
            headers: options.headers
        }

        function processClientRequest(clientRes: http.IncomingMessage): void {
            let data = ''
            clientRes.setEncoding('utf8')
            clientRes.on('data', chunk => { data += chunk })
            clientRes.on('end', () => resolve({
                headers: clientRes.headers,
                statusCode: clientRes.statusCode,
                statusMessage: clientRes.statusMessage,
                body: data
            }))
            clientRes.on('error', err => reject(err))
        }

        let clientReq: http.ClientRequest
        if (parsedUrl.protocol === 'http:') clientReq = http.request(opt, processClientRequest)
        else clientReq = https.request(opt, processClientRequest)
        clientReq.on('error', err => reject(err))
        if (options.data) clientReq.write(options.data)
        clientReq.end()
    })
}

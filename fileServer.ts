import * as mimeTypes from './mimeTypes'
import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'
import * as logger from 'logger'
import * as server from 'httpsServer'

export function mount(urlPath: string, fsPath: string) {
    if (urlPath.slice(-1) !== '/') throw new Error('urlPath must end with a /')
    if (!fs.lstatSync(fsPath).isDirectory()) throw new Error('fsPath must be a directory')
    const r = new RegExp(`^${urlPath.slice(0, -1)}`, 'i')
    
    server.get(urlPath + '*', (req, res) => {
        let p = url.parse(req.url).pathname
        if (p === '/') p += 'index.html'
        else if (p.slice(-1) === '/') return res.redirect(p + 'index.html')
        p = p.replace(r, '')
        const fpath = path.join(fsPath, p)
        let stat
        try { stat = fs.lstatSync(fpath) }
        catch(err) {
            logger.log(`File server did not find file: ${fpath}`, logger.WARN)
            return res.send(404)
        }
        if (stat.isDirectory()) return res.redirect(url.parse(req.url).pathname + '/index.html')

        //Serve the file
        let mimeType = mimeTypes.getMimeType(path.extname(fpath))
        if (!mimeType) mimeType = 'application/octet-stream'
        res.writeHead(200, {
            'Content-Type': mimeType,
        })
        const fileStream = fs.createReadStream(fpath)
        fileStream.on('error', err => {
            res.end()
            logger.log(err, logger.ERROR)
        })
        fileStream.pipe(res)
    })
}

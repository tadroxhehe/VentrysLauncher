const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = __dirname
const PORT = 8080
// Brief delay so distribution.json loads after the UI registers its listeners.
const DISTRO_STARTUP_DELAY_MS = 300

const MIME = {
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.jar': 'application/java-archive',
    '.zip': 'application/zip'
}

function sendFile(res, filePath, delayMs = 0) {
    const send = () => {
        const ext = path.extname(filePath).toLowerCase()
        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Access-Control-Allow-Origin': '*'
        })
        fs.createReadStream(filePath).pipe(res)
    }

    if (delayMs > 0) {
        setTimeout(send, delayMs)
    } else {
        send()
    }
}

const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*'
        })
        res.end()
        return
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
    }

    const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    const relativePath = urlPath === '/' ? '/distribution.json' : urlPath
    const filePath = path.normalize(path.join(ROOT, relativePath))

    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403)
        res.end()
        return
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404)
            res.end()
            return
        }

        if (req.method === 'HEAD') {
            res.writeHead(200, { 'Access-Control-Allow-Origin': '*' })
            res.end()
            return
        }

        const delay = path.basename(filePath) === 'distribution.json' ? DISTRO_STARTUP_DELAY_MS : 0
        sendFile(res, filePath, delay)
    })
})

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Distro server: http://127.0.0.1:${PORT}/distribution.json`)
})

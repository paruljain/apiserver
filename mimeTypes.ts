const mimeTypes = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.json': 'application/json',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.bin': 'application/octet-stream',
    '.sh': 'application/octet-stream',
    '.py': 'application/octet-stream',
    '.ps1': 'application/octet-stream',
    '.psm1': 'application/octet-stream',
    '.zip': 'application/octet-stream',
    '.log': 'text/plain',
    '.txt': 'text/plain'
}

export function getMimeType(fileExtension: string): string {
    return mimeTypes[fileExtension]
}

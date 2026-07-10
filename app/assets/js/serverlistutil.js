const fs = require('fs-extra')
const path = require('path')
const zlib = require('zlib')

const { LoggerUtil } = require('helios-core')

const logger = LoggerUtil.getLogger('ServerList')

function writeUtf(buffer, offset, value) {
    buffer.writeUInt16BE(Buffer.byteLength(value, 'utf8'), offset)
    offset += 2
    buffer.write(value, offset, 'utf8')
    return offset + Buffer.byteLength(value, 'utf8')
}

function sizeUtf(value) {
    return 2 + Buffer.byteLength(value, 'utf8')
}

/**
 * Build a Minecraft 1.18.2-compatible servers.dat payload (uncompressed NBT).
 *
 * @param {string} serverName Display name shown in the multiplayer list.
 * @param {string} serverAddress Hostname with optional port (host:port).
 * @returns {Buffer}
 */
function buildServersDatPayload(serverName, serverAddress) {
    const entrySize =
        1 + sizeUtf('name') + sizeUtf(serverName) +
        1 + sizeUtf('ip') + sizeUtf(serverAddress) +
        1 + sizeUtf('acceptTextures') + 1 +
        1

    const payloadSize =
        1 + sizeUtf('') +
        1 + sizeUtf('servers') +
        1 + 4 + entrySize +
        1

    const buffer = Buffer.alloc(payloadSize)
    let offset = 0

    buffer.writeUInt8(10, offset++)
    offset = writeUtf(buffer, offset, '')

    buffer.writeUInt8(9, offset++)
    offset = writeUtf(buffer, offset, 'servers')
    buffer.writeUInt8(10, offset++)
    buffer.writeInt32BE(1, offset)
    offset += 4

    buffer.writeUInt8(8, offset++)
    offset = writeUtf(buffer, offset, 'name')
    offset = writeUtf(buffer, offset, serverName)

    buffer.writeUInt8(8, offset++)
    offset = writeUtf(buffer, offset, 'ip')
    offset = writeUtf(buffer, offset, serverAddress)

    buffer.writeUInt8(1, offset++)
    offset = writeUtf(buffer, offset, 'acceptTextures')
    buffer.writeUInt8(1, offset++)

    buffer.writeUInt8(0, offset++)

    return buffer
}

/**
 * Ensure the instance servers.dat exists and matches the expected server entry.
 * Rewrites the file when missing, invalid, or out of date.
 *
 * @param {string} instanceDir Absolute path to the server instance directory.
 * @param {string} serverName Display name shown in the multiplayer list.
 * @param {string} serverAddress Hostname with optional port (host:port).
 */
function ensureDefaultServerList(instanceDir, serverName, serverAddress) {
    const serversDatPath = path.join(instanceDir, 'servers.dat')
    const payload = buildServersDatPayload(serverName, serverAddress)
    const expected = zlib.gzipSync(payload)

    fs.ensureDirSync(instanceDir)
    fs.writeFileSync(serversDatPath, expected)
    logger.info(`Prepared multiplayer server list at ${serversDatPath}`)
}

module.exports = {
    buildServersDatPayload,
    ensureDefaultServerList
}

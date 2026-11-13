import { readFileSync, writeFileSync } from 'node:fs'

const [iconDirectory, output] = process.argv.slice(2)
if (!iconDirectory || !output) throw new Error('Usage: node make-icns.mjs icon-directory output.icns')

const resources = [
  ['ic10', 'Flowdeck.iconset/icon_512x512@2x.png'],
  ['ic09', 'Flowdeck.iconset/icon_512x512.png'],
  ['ic08', 'Flowdeck.iconset/icon_256x256.png'],
  ['ic07', 'Flowdeck.iconset/icon_128x128.png'],
  ['icp5', 'Flowdeck.iconset/icon_32x32.png'],
  ['icp4', 'Flowdeck.iconset/icon_16x16.png'],
]

const chunks = resources.map(([type, path]) => {
  const png = readFileSync(`${iconDirectory}/${path}`)
  const header = Buffer.alloc(8)
  header.write(type, 0, 4, 'ascii')
  header.writeUInt32BE(png.length + 8, 4)
  return Buffer.concat([header, png])
})

const body = Buffer.concat(chunks)
const header = Buffer.alloc(8)
header.write('icns', 0, 4, 'ascii')
header.writeUInt32BE(body.length + 8, 4)
writeFileSync(output, Buffer.concat([header, body]))

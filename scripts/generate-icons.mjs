import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const output = process.argv[2] ?? 'src-tauri/icons/icon-1024.png'
mkdirSync(new URL('.', `file://${process.cwd()}/${output}`).pathname, { recursive: true })

const size = 1024
const scale = 2
const workSize = size * scale
const pixels = new Uint8Array(workSize * workSize * 4)

const colors = {
  navy: [23, 32, 51, 255],
  white: [239, 246, 255, 255],
  blue: [59, 130, 246, 255],
  sky: [96, 165, 250, 255],
}

function blendPixel(x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= workSize || y >= workSize) return
  const index = (y * workSize + x) * 4
  const sourceAlpha = color[3] / 255 * alpha
  const destAlpha = pixels[index + 3] / 255
  const outAlpha = sourceAlpha + destAlpha * (1 - sourceAlpha)
  if (outAlpha === 0) return
  for (let channel = 0; channel < 3; channel++) {
    pixels[index + channel] = Math.round((color[channel] * sourceAlpha + pixels[index + channel] * destAlpha * (1 - sourceAlpha)) / outAlpha)
  }
  pixels[index + 3] = Math.round(outAlpha * 255)
}

function roundedRect(x, y, width, height, radius, color) {
  x *= scale; y *= scale; width *= scale; height *= scale; radius *= scale
  const left = Math.floor(x), right = Math.ceil(x + width)
  const top = Math.floor(y), bottom = Math.ceil(y + height)
  for (let py = top; py < bottom; py++) for (let px = left; px < right; px++) {
    const cx = Math.max(x + radius, Math.min(px + 0.5, x + width - radius))
    const cy = Math.max(y + radius, Math.min(py + 0.5, y + height - radius))
    const distance = Math.hypot(px + 0.5 - cx, py + 0.5 - cy)
    if (distance <= radius) blendPixel(px, py, color)
  }
}

function circle(cx, cy, radius, color) {
  cx *= scale; cy *= scale; radius *= scale
  for (let y = Math.floor(cy - radius); y < Math.ceil(cy + radius); y++) for (let x = Math.floor(cx - radius); x < Math.ceil(cx + radius); x++) {
    if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= radius) blendPixel(x, y, color)
  }
}

roundedRect(32, 32, 960, 960, 224, colors.navy)
roundedRect(248, 232, 160, 560, 64, colors.white)
roundedRect(376, 232, 400, 160, 64, colors.sky)
roundedRect(376, 432, 304, 152, 60, colors.blue)
circle(756, 756, 76, colors.sky)

const downsampled = new Uint8Array(size * size * 4)
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  for (let channel = 0; channel < 4; channel++) {
    let total = 0
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      total += pixels[(((y * scale + sy) * workSize + (x * scale + sx)) * 4) + channel]
    }
    downsampled[(y * size + x) * 4 + channel] = Math.round(total / (scale * scale))
  }
}

const scanlines = Buffer.alloc((size * 4 + 1) * size)
for (let y = 0; y < size; y++) {
  const row = y * (size * 4 + 1)
  scanlines[row] = 0
  Buffer.from(downsampled.buffer, y * size * 4, size * 4).copy(scanlines, row + 1)
}

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}
function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(scanlines, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync(output, png)

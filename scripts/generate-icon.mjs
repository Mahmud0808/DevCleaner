import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'build')
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
const PNG_SIZE = 1024

const TILE_TOP = [0x3f, 0xcb, 0x9e]
const TILE_BOTTOM = [0x1f, 0xa2, 0x78]
const MARK = [0x06, 0x1f, 0x18]
const BARS = [
  { width: 0.625, alpha: 1 },
  { width: 0.414, alpha: 0.68 },
  { width: 0.234, alpha: 0.34 }
]

function roundedRectDistance(x, y, left, top, width, height, radius) {
  const cx = left + width / 2
  const cy = top + height / 2
  const hw = width / 2
  const hh = height / 2
  const r = Math.min(radius, hw, hh)
  const qx = Math.abs(x - cx) - (hw - r)
  const qy = Math.abs(y - cy) - (hh - r)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  return Math.min(Math.max(qx, qy), 0) + outside - r
}

function roundedRectCoverage(x, y, left, top, width, height, radius) {
  const distance = roundedRectDistance(x, y, left, top, width, height, radius)
  return Math.min(1, Math.max(0, 0.5 - distance))
}

function render(size) {
  const pixels = new Uint8Array(size * size * 4)
  const scale = size / 1024

  const tileRadius = 232 * scale
  const barHeight = 160 * scale
  const barGap = 104 * scale
  const barLeft = 192 * scale
  const stackTop = (1024 - (3 * 160 + 2 * 104)) / 2 * scale

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = px + 0.5
      const y = py + 0.5
      const offset = (py * size + px) * 4

      const tileDistance = roundedRectDistance(x, y, 0, 0, size, size, tileRadius)
      const tile = Math.min(1, Math.max(0, 0.5 - tileDistance))
      if (tile <= 0) continue

      const vertical = py / (size - 1)
      let r = TILE_TOP[0] + (TILE_BOTTOM[0] - TILE_TOP[0]) * vertical
      let g = TILE_TOP[1] + (TILE_BOTTOM[1] - TILE_TOP[1]) * vertical
      let b = TILE_TOP[2] + (TILE_BOTTOM[2] - TILE_TOP[2]) * vertical

      const band = 12 * scale
      const edge = Math.min(1, Math.max(0, 1 + tileDistance / band))
      const highlight = edge * Math.min(1, Math.max(0, 1 - vertical / 0.4)) * 0.22
      if (highlight > 0) {
        r = r + (255 - r) * highlight
        g = g + (255 - g) * highlight
        b = b + (255 - b) * highlight
      }

      for (let index = 0; index < BARS.length; index++) {
        const bar = BARS[index]
        const top = stackTop + index * (barHeight + barGap)
        const coverage =
          roundedRectCoverage(x, y, barLeft, top, bar.width * size, barHeight, barHeight / 2) *
          bar.alpha
        if (coverage <= 0) continue
        r = r + (MARK[0] - r) * coverage
        g = g + (MARK[1] - g) * coverage
        b = b + (MARK[2] - b) * coverage
      }

      pixels[offset] = Math.round(r)
      pixels[offset + 1] = Math.round(g)
      pixels[offset + 2] = Math.round(b)
      pixels[offset + 3] = Math.round(tile * 255)
    }
  }

  return pixels
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

function encodePng(pixels, size) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let row = 0; row < size; row++) {
    raw[row * (stride + 1)] = 0
    Buffer.from(pixels.buffer, row * stride, stride).copy(raw, row * (stride + 1) + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function encodeIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)

  const directory = Buffer.alloc(entries.length * 16)
  let offset = 6 + directory.length

  entries.forEach((entry, index) => {
    const at = index * 16
    directory[at] = entry.size >= 256 ? 0 : entry.size
    directory[at + 1] = entry.size >= 256 ? 0 : entry.size
    directory[at + 2] = 0
    directory[at + 3] = 0
    directory.writeUInt16LE(1, at + 4)
    directory.writeUInt16LE(32, at + 6)
    directory.writeUInt32LE(entry.png.length, at + 8)
    directory.writeUInt32LE(offset, at + 12)
    offset += entry.png.length
  })

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.png)])
}

mkdirSync(OUT_DIR, { recursive: true })

const master = encodePng(render(PNG_SIZE), PNG_SIZE)
writeFileSync(join(OUT_DIR, 'icon.png'), master)

const ico = encodeIco(
  ICO_SIZES.map((size) => ({ size, png: encodePng(render(size), size) }))
)
writeFileSync(join(OUT_DIR, 'icon.ico'), ico)

console.log(`icon.png  ${PNG_SIZE}x${PNG_SIZE}  ${master.length} bytes`)
console.log(`icon.ico  ${ICO_SIZES.join(', ')}  ${ico.length} bytes`)

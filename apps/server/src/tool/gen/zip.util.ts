function makeCrcTable() {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) === 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
}

const CRC_TABLE = makeCrcTable()

function crc32(buffer: Buffer) {
  let crc = 0xFFFFFFFF
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear())
  const dosTime = ((date.getHours() & 0x1F) << 11) | ((date.getMinutes() & 0x3F) << 5) | Math.floor(date.getSeconds() / 2)
  const dosDate = (((year - 1980) & 0x7F) << 9) | (((date.getMonth() + 1) & 0x0F) << 5) | (date.getDate() & 0x1F)
  return { dosTime, dosDate }
}

function u16(value: number) {
  const buffer = Buffer.allocUnsafe(2)
  buffer.writeUInt16LE(value & 0xFFFF, 0)
  return buffer
}

function u32(value: number) {
  const buffer = Buffer.allocUnsafe(4)
  buffer.writeUInt32LE(value >>> 0, 0)
  return buffer
}

export function createZipArchive(files: Record<string, string | Buffer>) {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  const now = new Date()
  const { dosTime, dosDate } = dosDateTime(now)

  for (const [name, raw] of Object.entries(files)) {
    const fileName = name.replace(/\\/g, '/')
    const fileNameBuffer = Buffer.from(fileName, 'utf8')
    const contentBuffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, 'utf8')
    const checksum = crc32(contentBuffer)

    const localHeader = Buffer.concat([
      u32(0x04034B50),
      u16(20),
      u16(0),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(checksum),
      u32(contentBuffer.length),
      u32(contentBuffer.length),
      u16(fileNameBuffer.length),
      u16(0),
      fileNameBuffer,
    ])

    locals.push(localHeader, contentBuffer)

    const centralHeader = Buffer.concat([
      u32(0x02014B50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(checksum),
      u32(contentBuffer.length),
      u32(contentBuffer.length),
      u16(fileNameBuffer.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      fileNameBuffer,
    ])

    centrals.push(centralHeader)
    offset += localHeader.length + contentBuffer.length
  }

  const centralDirectory = Buffer.concat(centrals)
  const endRecord = Buffer.concat([
    u32(0x06054B50),
    u16(0),
    u16(0),
    u16(centrals.length),
    u16(centrals.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0),
  ])

  return Buffer.concat([...locals, centralDirectory, endRecord])
}
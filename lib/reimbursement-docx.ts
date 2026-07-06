type ZipFile = { name: string; data: Uint8Array }

type TripForExport = {
  name: string
}

type ExpenseForExport = {
  id: string
  title: string
  expense_date: string
  expense_time?: string | null
  receipt_url?: string | null
  screenshot_url?: string | null
}

type ExportImageKind = 'receipt' | 'screenshot'

type ExportImage = {
  kind: ExportImageKind
  expense: ExpenseForExport
  bytes: Uint8Array
  mime: string
  extension: string
  width: number
  height: number
  relId: string
  mediaName: string
  docPrId: number
}

const encoder = new TextEncoder()
const emuPerCm = 360000

export async function createReimbursementDocx(trip: TripForExport, expenses: ExpenseForExport[]) {
  const sorted = [...expenses].sort(compareExpensesByTime)
  const receiptImages = await collectImages(sorted, 'receipt')
  const screenshotImages = await collectImages(sorted, 'screenshot')
  const images = [...receiptImages, ...screenshotImages]

  if (!images.length) {
    throw new Error('该行程没有可导出的发票或消费截图')
  }

  images.forEach((image, index) => {
    image.relId = `rIdImage${index + 1}`
    image.mediaName = `image${index + 1}.${image.extension}`
    image.docPrId = index + 1
  })

  const documentXml = buildDocumentXml(trip, receiptImages, screenshotImages)
  const files: ZipFile[] = [
    textFile('[Content_Types].xml', buildContentTypesXml(images)),
    textFile('_rels/.rels', buildRootRelsXml()),
    textFile('docProps/core.xml', buildCorePropsXml(trip.name)),
    textFile('docProps/app.xml', buildAppPropsXml()),
    textFile('word/document.xml', documentXml),
    textFile('word/styles.xml', buildStylesXml()),
    textFile('word/_rels/document.xml.rels', buildDocumentRelsXml(images)),
    ...images.map((image) => ({
      name: `word/media/${image.mediaName}`,
      data: image.bytes,
    })),
  ]

  return createZipArchive(files)
}

async function collectImages(expenses: ExpenseForExport[], kind: ExportImageKind) {
  const images: ExportImage[] = []
  for (const expense of expenses) {
    const source = kind === 'receipt' ? expense.receipt_url : expense.screenshot_url
    const loaded = await loadImage(source || '')
    if (!loaded) continue

    const size = getImageSize(loaded.bytes, loaded.mime)
    images.push({
      kind,
      expense,
      bytes: loaded.bytes,
      mime: loaded.mime,
      extension: mimeToExtension(loaded.mime),
      width: size.width,
      height: size.height,
      relId: '',
      mediaName: '',
      docPrId: 0,
    })
  }
  return images
}

async function loadImage(source: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const trimmed = source.trim()
  if (!trimmed) return null

  const dataUrl = decodeDataUrl(trimmed)
  if (dataUrl) return dataUrl

  if (/^https?:\/\//i.test(trimmed)) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const res = await fetch(trimmed, { signal: controller.signal })
      if (!res.ok) return null
      const mime = res.headers.get('content-type')?.split(';')[0] || 'application/octet-stream'
      if (!mime.startsWith('image/')) return null
      return { bytes: new Uint8Array(await res.arrayBuffer()), mime }
    } catch (e) {
      console.error('Failed to load export image:', e)
    } finally {
      clearTimeout(timeout)
    }
  }

  return null
}

function decodeDataUrl(value: string): { bytes: Uint8Array; mime: string } | null {
  const match = value.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/)
  if (!match) return null

  const mime = match[1] || 'application/octet-stream'
  if (!mime.startsWith('image/')) return null

  if (match[2]) {
    return { bytes: new Uint8Array(Buffer.from(match[3] || '', 'base64')), mime }
  }

  try {
    return { bytes: encoder.encode(decodeURIComponent(match[3] || '')), mime }
  } catch {
    return null
  }
}

function buildDocumentXml(trip: TripForExport, receiptImages: ExportImage[], screenshotImages: ExportImage[]) {
  const bodyParts: string[] = []
  appendReceiptRows(bodyParts, receiptImages)
  if (receiptImages.length && screenshotImages.length) {
    bodyParts.push(buildSpacerParagraphs())
  }
  appendScreenshotRows(bodyParts, screenshotImages)

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyParts.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="851" w:footer="992" w:gutter="0"/>
      <w:cols w:space="425"/>
      <w:docGrid w:type="lines" w:linePitch="312"/>
    </w:sectPr>
  </w:body>
</w:document>`
}

function appendReceiptRows(parts: string[], images: ExportImage[]) {
  for (let index = 0; index < images.length; index++) {
    if (index > 0) {
      parts.push(buildSpacerParagraphs())
    }
    const image = images[index]
    parts.push(buildReceiptParagraph(image))
  }
}

function appendScreenshotRows(parts: string[], images: ExportImage[]) {
  for (let index = 0; index < images.length; index += 2) {
    if (index > 0) {
      parts.push(buildSpacerParagraphs())
    }
    parts.push(buildScreenshotTableRow(images.slice(index, index + 2)))
  }
}

function buildReceiptParagraph(image: ExportImage) {
  const size = fitImage(image, isPortraitLike(image) ? 7.2 : 15.8, isPortraitLike(image) ? 11.8 : 11.2)

  return `<w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
      ${buildDrawingRun(image, size.widthCm, size.heightCm)}
    </w:p>`
}

function buildScreenshotTableRow(images: ExportImage[]) {
  const cells = [images[0], images[1]].map((image) => buildScreenshotCell(image)).join('')

  return `<w:tbl>
      <w:tblPr>
        <w:tblW w:w="7920" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblCellMar>
          <w:top w:w="0" w:type="dxa"/>
          <w:left w:w="60" w:type="dxa"/>
          <w:bottom w:w="0" w:type="dxa"/>
          <w:right w:w="60" w:type="dxa"/>
        </w:tblCellMar>
        <w:tblBorders>
          <w:top w:val="nil"/>
          <w:left w:val="nil"/>
          <w:bottom w:val="nil"/>
          <w:right w:val="nil"/>
          <w:insideH w:val="nil"/>
          <w:insideV w:val="nil"/>
        </w:tblBorders>
        <w:tblLayout w:type="fixed"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="3960"/>
        <w:gridCol w:w="3960"/>
      </w:tblGrid>
      <w:tr>
        ${cells}
      </w:tr>
    </w:tbl>`
}

function buildScreenshotCell(image?: ExportImage) {
  if (!image) {
    return `<w:tc>
          <w:tcPr>
            <w:tcW w:w="3960" w:type="dxa"/>
            <w:vAlign w:val="top"/>
          </w:tcPr>
          <w:p/>
        </w:tc>`
  }

  const size = fitImage(image, 6.9, 12.0)
  return `<w:tc>
          <w:tcPr>
            <w:tcW w:w="3960" w:type="dxa"/>
            <w:vAlign w:val="top"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
            </w:pPr>
            ${buildDrawingRun(image, size.widthCm, size.heightCm)}
          </w:p>
        </w:tc>`
}

function buildSpacerParagraphs() {
  const paragraph = `<w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
    </w:p>`

  return `${paragraph}
    ${paragraph}`
}

function buildDrawingRun(image: ExportImage, widthCm: number, heightCm: number) {
  const cx = Math.round(widthCm * emuPerCm)
  const cy = Math.round(heightCm * emuPerCm)
  const name = xmlEscape(`${image.expense.expense_date}-${image.expense.title}-${image.kind}`)
  const descr = xmlEscape(`${image.kind === 'receipt' ? '发票' : '消费截图'} ${image.expense.expense_date} ${image.expense.title}`)

  return `<w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="${cx}" cy="${cy}"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:docPr id="${image.docPrId}" name="${name}" descr="${descr}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr>
                    <pic:cNvPr id="0" name="${xmlEscape(image.mediaName)}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${image.relId}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${cx}" cy="${cy}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>`
}

function buildContentTypesXml(images: ExportImage[]) {
  const imageTypes = Array.from(new Map(images.map((image) => [image.extension, image.mime])).entries())
    .map(([extension, mime]) => `  <Default Extension="${xmlEscape(extension)}" ContentType="${xmlEscape(mime)}"/>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
${imageTypes}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
}

function buildRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
}

function buildDocumentRelsXml(images: ExportImage[]) {
  const imageRels = images
    .map((image) => `  <Relationship Id="${image.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${xmlEscape(image.mediaName)}"/>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
${imageRels}
</Relationships>`
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="100" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:hAnsi="Microsoft YaHei"/>
      <w:sz w:val="21"/>
      <w:szCs w:val="21"/>
    </w:rPr>
  </w:style>
</w:styles>`
}

function buildCorePropsXml(title: string) {
  const now = new Date().toISOString()
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xmlEscape(title)}</dc:title>
  <dc:creator>myMoney</dc:creator>
  <cp:lastModifiedBy>myMoney</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`
}

function buildAppPropsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>myMoney</Application>
</Properties>`
}

function fitImage(image: ExportImage, maxWidthCm: number, maxHeightCm: number) {
  const width = Math.max(1, image.width)
  const height = Math.max(1, image.height)
  const ratio = Math.min(maxWidthCm / width, maxHeightCm / height)
  return {
    widthCm: width * ratio,
    heightCm: height * ratio,
  }
}

function isPortraitLike(image: ExportImage) {
  return image.height > image.width * 1.1
}

function getImageSize(data: Uint8Array, mime: string) {
  if (mime.includes('png')) return getPngSize(data) || { width: 1200, height: 800 }
  if (mime.includes('jpeg') || mime.includes('jpg')) return getJpegSize(data) || { width: 1200, height: 800 }
  if (mime.includes('gif')) return getGifSize(data) || { width: 1200, height: 800 }
  if (mime.includes('webp')) return getWebpSize(data) || { width: 1200, height: 800 }
  return { width: 1200, height: 800 }
}

function getPngSize(data: Uint8Array) {
  if (data.length < 24) return null
  const view = dataView(data)
  if (view.getUint32(0) !== 0x89504e47) return null
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function getGifSize(data: Uint8Array) {
  if (data.length < 10) return null
  const header = String.fromCharCode(...data.slice(0, 6))
  if (header !== 'GIF87a' && header !== 'GIF89a') return null
  const view = dataView(data)
  return { width: view.getUint16(6, true), height: view.getUint16(8, true) }
}

function getJpegSize(data: Uint8Array) {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null
  let offset = 2
  while (offset < data.length) {
    while (data[offset] === 0xff) offset += 1
    const marker = data[offset]
    offset += 1
    if (marker === 0xd9 || marker === 0xda) break
    if (offset + 2 > data.length) break
    const length = (data[offset] << 8) + data[offset + 1]
    if (length < 2 || offset + length > data.length) break
    if (
      marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3 ||
      marker === 0xc5 || marker === 0xc6 || marker === 0xc7 || marker === 0xc9 ||
      marker === 0xca || marker === 0xcb || marker === 0xcd || marker === 0xce ||
      marker === 0xcf
    ) {
      return {
        height: (data[offset + 3] << 8) + data[offset + 4],
        width: (data[offset + 5] << 8) + data[offset + 6],
      }
    }
    offset += length
  }
  return null
}

function getWebpSize(data: Uint8Array) {
  if (data.length < 30) return null
  const signature = String.fromCharCode(...data.slice(0, 4)) + String.fromCharCode(...data.slice(8, 12))
  if (signature !== 'RIFFWEBP') return null
  const chunk = String.fromCharCode(...data.slice(12, 16))
  const view = dataView(data)
  if (chunk === 'VP8X') {
    return {
      width: 1 + data[24] + (data[25] << 8) + (data[26] << 16),
      height: 1 + data[27] + (data[28] << 8) + (data[29] << 16),
    }
  }
  if (chunk === 'VP8 ' && data.length >= 30) {
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    }
  }
  if (chunk === 'VP8L' && data.length >= 25) {
    const bits = data[21] | (data[22] << 8) | (data[23] << 16) | (data[24] << 24)
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    }
  }
  return null
}

function dataView(data: Uint8Array) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength)
}

function compareExpensesByTime(a: ExpenseForExport, b: ExpenseForExport) {
  const aKey = `${a.expense_date || ''} ${a.expense_time || '23:59'} ${a.id}`
  const bKey = `${b.expense_date || ''} ${b.expense_time || '23:59'} ${b.id}`
  return aKey.localeCompare(bKey)
}

function mimeToExtension(mime: string) {
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpeg'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('webp')) return 'webp'
  return 'bin'
}

function textFile(name: string, text: string): ZipFile {
  return { name, data: encoder.encode(text) }
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const crcTable = createCrcTable()

function createCrcTable() {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (let index = 0; index < data.length; index += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[index]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createZipArchive(files: ZipFile[]) {
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const checksum = crc32(file.data)
    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, dosTime, true)
    localView.setUint16(12, dosDate, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, file.data.length, true)
    localView.setUint32(22, file.data.length, true)
    localView.setUint16(26, name.length, true)
    localView.setUint16(28, 0, true)
    local.set(name, 30)
    localParts.push(local, file.data)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, dosTime, true)
    centralView.setUint16(14, dosDate, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, file.data.length, true)
    centralView.setUint32(24, file.data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, offset, true)
    central.set(name, 46)
    centralParts.push(central)

    offset += local.length + file.data.length
  }

  const centralOffset = offset
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, centralOffset, true)
  endView.setUint16(20, 0, true)

  return concatUint8Arrays([...localParts, ...centralParts, end])
}

function concatUint8Arrays(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

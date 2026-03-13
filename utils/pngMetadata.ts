
// CRC32 Table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

const crc32 = (buf: Uint8Array): number => {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
};

// UTF-8 safe encoding/decoding via standard APIs
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ASCII-only helper for chunk type names and keywords (always ASCII)
const asciiToUint8 = (s: string) => {
  const data = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) data[i] = s.charCodeAt(i);
  return data;
};

const uint8ToAscii = (buf: Uint8Array) => {
    let s = "";
    for(let i=0; i<buf.length; i++) s += String.fromCharCode(buf[i]);
    return s;
};

// Write a 32-bit int (Big Endian)
const writeUint32 = (arr: Uint8Array, offset: number, val: number) => {
  arr[offset] = (val >>> 24) & 0xff;
  arr[offset + 1] = (val >>> 16) & 0xff;
  arr[offset + 2] = (val >>> 8) & 0xff;
  arr[offset + 3] = val & 0xff;
};

export const injectMetadata = async (blob: Blob, key: string, value: string): Promise<Blob> => {
  const arrayBuffer = await blob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // Check PNG Signature
  if (data[0] !== 137 || data[1] !== 80 || data[2] !== 78 || data[3] !== 71) {
    throw new Error("Not a valid PNG");
  }

  // Use iTXt chunk for proper UTF-8 support
  // Format: Length(4) + Type(4) + Data + CRC(4)
  // Data: Keyword + \0 + CompressionFlag(1) + CompressionMethod(1) + LanguageTag + \0 + TranslatedKeyword + \0 + Text
  const keyData = asciiToUint8(key);
  const valData = encoder.encode(value); // UTF-8 encoded
  // keyword \0 compressionFlag(0) compressionMethod(0) languageTag \0 translatedKeyword \0 text
  const chunkLen = keyData.length + 1 + 1 + 1 + 1 + 1 + valData.length;

  // Total size: 4 (len) + 4 (type) + len + 4 (crc)
  const totalChunkSize = 12 + chunkLen;

  const chunk = new Uint8Array(totalChunkSize);

  // Length
  writeUint32(chunk, 0, chunkLen);

  // Type 'iTXt'
  chunk[4] = 105; chunk[5] = 84; chunk[6] = 88; chunk[7] = 116;

  // Data
  let offset = 8;
  chunk.set(keyData, offset); offset += keyData.length;
  chunk[offset++] = 0; // Null separator after keyword
  chunk[offset++] = 0; // Compression flag (0 = uncompressed)
  chunk[offset++] = 0; // Compression method
  chunk[offset++] = 0; // Language tag (empty) + null separator
  chunk[offset++] = 0; // Translated keyword (empty) + null separator
  chunk.set(valData, offset);

  // CRC (Calculated on Type + Data)
  const crc = crc32(chunk.slice(4, totalChunkSize - 4));
  writeUint32(chunk, totalChunkSize - 4, crc);

  // Insert before IEND
  let pos = 8;
  while (pos < data.length) {
    const len = (data[pos] << 24) | (data[pos+1] << 16) | (data[pos+2] << 8) | data[pos+3];
    const type = uint8ToAscii(data.slice(pos+4, pos+8));

    if (type === 'IEND') {
        break;
    }
    pos += 12 + len;
  }

  // Construct new buffer
  const final = new Uint8Array(data.length + totalChunkSize);
  final.set(data.slice(0, pos), 0);
  final.set(chunk, pos);
  final.set(data.slice(pos), pos + totalChunkSize);

  return new Blob([final], { type: 'image/png' });
};

export const extractMetadata = async (file: File, key: string): Promise<string | null> => {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    // Check Signature
    if (data[0] !== 137 || data[1] !== 80) return null;

    let pos = 8;
    while (pos < data.length) {
        const len = (data[pos] << 24) | (data[pos+1] << 16) | (data[pos+2] << 8) | data[pos+3];
        const type = uint8ToAscii(data.slice(pos+4, pos+8));

        if (type === 'iTXt') {
            const content = data.slice(pos+8, pos+8+len);
            // Find keyword null terminator
            let sep = -1;
            for(let i=0; i<content.length; i++) {
                if (content[i] === 0) { sep = i; break; }
            }
            if (sep !== -1) {
                const keyword = uint8ToAscii(content.slice(0, sep));
                if (keyword === key) {
                    // Skip: null(1) + compressionFlag(1) + compressionMethod(1) + languageTag + null + translatedKeyword + null
                    let textStart = sep + 1 + 1 + 1; // past null, compressionFlag, compressionMethod
                    // Skip language tag (find next null)
                    while (textStart < content.length && content[textStart] !== 0) textStart++;
                    textStart++; // past null
                    // Skip translated keyword (find next null)
                    while (textStart < content.length && content[textStart] !== 0) textStart++;
                    textStart++; // past null
                    return decoder.decode(content.slice(textStart));
                }
            }
        }

        // Backward compatibility: also read legacy tEXt chunks
        if (type === 'tEXt') {
            const content = data.slice(pos+8, pos+8+len);
            let separator = -1;
            for(let i=0; i<content.length; i++) {
                if (content[i] === 0) { separator = i; break; }
            }
            if (separator !== -1) {
                const keyword = uint8ToAscii(content.slice(0, separator));
                if (keyword === key) {
                    // Legacy: try UTF-8 decode first, falls back gracefully for Latin-1
                    return decoder.decode(content.slice(separator + 1));
                }
            }
        }

        if (type === 'IEND') break;
        pos += 12 + len;
    }

    return null;
};


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

const stringToUint8 = (s: string) => {
  const data = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) data[i] = s.charCodeAt(i);
  return data;
};

const uint8ToString = (buf: Uint8Array) => {
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

  // Prepare tEXt chunk
  // Format: Length(4) + Type(4) + Data(Keyword + Null + Text) + CRC(4)
  const keyData = stringToUint8(key);
  const valData = stringToUint8(value);
  const chunkLen = keyData.length + 1 + valData.length;
  
  // Total size: 4 (len) + 4 (type) + len + 4 (crc)
  const totalChunkSize = 12 + chunkLen;
  
  const chunk = new Uint8Array(totalChunkSize);
  
  // Length
  writeUint32(chunk, 0, chunkLen);
  
  // Type 'tEXt'
  chunk[4] = 116; chunk[5] = 69; chunk[6] = 88; chunk[7] = 116;
  
  // Data
  chunk.set(keyData, 8);
  chunk[8 + keyData.length] = 0; // Null separator
  chunk.set(valData, 8 + keyData.length + 1);
  
  // CRC (Calculated on Type + Data)
  const crc = crc32(chunk.slice(4, totalChunkSize - 4));
  writeUint32(chunk, totalChunkSize - 4, crc);

  // Insert before IEND
  // Find IEND
  let pos = 8;
  while (pos < data.length) {
    const len = (data[pos] << 24) | (data[pos+1] << 16) | (data[pos+2] << 8) | data[pos+3];
    const type = uint8ToString(data.slice(pos+4, pos+8));
    
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
        const type = uint8ToString(data.slice(pos+4, pos+8));
        
        if (type === 'tEXt') {
            const content = data.slice(pos+8, pos+8+len);
            // Split by null byte
            let separator = -1;
            for(let i=0; i<content.length; i++) {
                if (content[i] === 0) { separator = i; break; }
            }
            
            if (separator !== -1) {
                const keyword = uint8ToString(content.slice(0, separator));
                if (keyword === key) {
                    return uint8ToString(content.slice(separator + 1));
                }
            }
        }
        
        if (type === 'IEND') break;
        pos += 12 + len;
    }
    
    return null;
};

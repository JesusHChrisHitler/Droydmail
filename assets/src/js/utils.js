const ALIAS_ADJECTIVES = [
  'swift','silent','crazy','epic','wild','cool','dark','bold','quick','happy',
  'lucky','super','mega','ultra','hyper','cosmic','mystic','ninja','cyber','pixel',
  'neon','atomic','frozen','blazing','sonic','turbo','stealth','savage','royal','prime'
];

const ALIAS_NOUNS = [
  'wolf','dragon','hawk','tiger','phoenix','storm','blade','shadow','knight','hunter',
  'rider','gamer','spark','frost','blaze','viper','ghost','raven','cobra','eagle',
  'panther','falcon','serpent','wizard','titan','reaper','sniper','raider','legend','fury'
];

export function generateRandomAlias() {
  const adj = ALIAS_ADJECTIVES[Math.floor(Math.random() * ALIAS_ADJECTIVES.length)];
  const noun = ALIAS_NOUNS[Math.floor(Math.random() * ALIAS_NOUNS.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return adj + noun + num;
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const FILE_MAGIC_BYTES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'application/zip': [0x50, 0x4B, 0x03, 0x04],
};

export async function validateFileMagicBytes(file) {
  const magic = FILE_MAGIC_BYTES[file.type];
  if (!magic) return { valid: true };
  
  const buffer = await file.slice(0, magic.length).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) {
      return { valid: false, error: `${file.name}: content does not match ${file.type}` };
    }
  }
  return { valid: true };
}

export async function validateFiles(files) {
  const results = await Promise.all(files.map(validateFileMagicBytes));
  const invalid = results.filter(r => !r.valid);
  return { valid: invalid.length === 0, errors: invalid.map(r => r.error) };
}
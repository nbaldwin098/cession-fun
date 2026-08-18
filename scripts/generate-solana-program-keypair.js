const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Base58 encoder
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function encodeBase58(buffer) {
  let digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += buffer[i];
    let carry = 0;
    for (let j = 0; j < digits.length; j++) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) digits.push(0);
  return digits.reverse().map(d => ALPHABET[d]).join('');
}

const targetDir = path.join(__dirname, '..', 'contracts', 'solana', 'target', 'deploy');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const keypairPath = path.join(targetDir, 'cession_bonding_curve-keypair.json');

let secretKeyBytes;
if (fs.existsSync(keypairPath)) {
  secretKeyBytes = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf8')));
} else {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubRaw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  const privRaw = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32);
  secretKeyBytes = new Uint8Array(64);
  secretKeyBytes.set(privRaw, 0);
  secretKeyBytes.set(pubRaw, 32);
  fs.writeFileSync(keypairPath, JSON.stringify(Array.from(secretKeyBytes)), 'utf8');
}

const pubKeyBytes = secretKeyBytes.subarray(32, 64);
const programId = encodeBase58(pubKeyBytes);

console.log('PROGRAM_ID:', programId);
console.log('KEYPAIR_PATH:', keypairPath);

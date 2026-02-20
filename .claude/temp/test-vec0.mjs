// Diagnostic: test vec0 INSERT with better-sqlite3 + sqlite-vec
import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import { tmpdir } from 'os'
import { join } from 'path'

const dbPath = join(tmpdir(), 'test-vec0.db')
const db = new Database(dbPath)

sqliteVec.load(db)
console.log('sqlite-vec loaded')

db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS test_embeddings USING vec0(
    chunk_id INTEGER PRIMARY KEY,
    embedding float[4]
  );
`)
console.log('vec0 table created')

// Test 1: Insert with Number
try {
  const chunkId = 1
  const embedding = new Float32Array([0.1, 0.2, 0.3, 0.4])
  const buf = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength)
  console.log('chunkId type:', typeof chunkId, 'value:', chunkId)
  console.log('buf type:', buf.constructor.name, 'length:', buf.length)
  db.prepare('INSERT INTO test_embeddings (chunk_id, embedding) VALUES (?, ?)').run(chunkId, buf)
  console.log('Test 1 PASSED: Number insert works')
} catch (err) {
  console.error('Test 1 FAILED:', err.message)
}

// Test 2: Insert with BigInt
try {
  const chunkId = 2n
  const embedding = new Float32Array([0.5, 0.6, 0.7, 0.8])
  const buf = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength)
  db.prepare('INSERT INTO test_embeddings (chunk_id, embedding) VALUES (?, ?)').run(chunkId, buf)
  console.log('Test 2 PASSED: BigInt insert works')
} catch (err) {
  console.error('Test 2 FAILED:', err.message)
}

// Test 3: Insert with Uint8Array (NOT Buffer)
try {
  const chunkId = 3
  const embedding = new Float32Array([0.9, 1.0, 1.1, 1.2])
  const uint8 = new Uint8Array(embedding.buffer, embedding.byteOffset, embedding.byteLength)
  db.prepare('INSERT INTO test_embeddings (chunk_id, embedding) VALUES (?, ?)').run(chunkId, uint8)
  console.log('Test 3 PASSED: Uint8Array insert works')
} catch (err) {
  console.error('Test 3 FAILED:', err.message)
}

// Test 4: Simulate lastInsertRowid flow
try {
  db.exec('CREATE TABLE IF NOT EXISTS test_chunks (id INTEGER PRIMARY KEY AUTOINCREMENT, text_val TEXT)')
  const result = db.prepare('INSERT INTO test_chunks (text_val) VALUES (?)').run('hello')
  console.log('lastInsertRowid type:', typeof result.lastInsertRowid, 'value:', result.lastInsertRowid)

  const chunkId = Number(result.lastInsertRowid)
  console.log('Number(lastInsertRowid) type:', typeof chunkId, 'value:', chunkId, 'isSafeInteger:', Number.isSafeInteger(chunkId))

  const embedding = new Float32Array([1.3, 1.4, 1.5, 1.6])
  const buf = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength)
  db.prepare('INSERT INTO test_embeddings (chunk_id, embedding) VALUES (?, ?)').run(chunkId, buf)
  console.log('Test 4 PASSED: Number(lastInsertRowid) insert works')
} catch (err) {
  console.error('Test 4 FAILED:', err.message)
}

// Test 5: 1536-dimension embedding (actual size)
try {
  const chunkId = 5
  const embedding = new Float32Array(1536)
  for (let i = 0; i < 1536; i++) embedding[i] = Math.random()

  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS test_full USING vec0(
    chunk_id INTEGER PRIMARY KEY,
    embedding float[1536]
  )`)

  const buf = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength)
  console.log('Full embedding buf length:', buf.length, '(expected:', 1536 * 4, ')')
  db.prepare('INSERT INTO test_full (chunk_id, embedding) VALUES (?, ?)').run(chunkId, buf)
  console.log('Test 5 PASSED: 1536-dim embedding works')
} catch (err) {
  console.error('Test 5 FAILED:', err.message)
}

db.close()
console.log('\nDone!')

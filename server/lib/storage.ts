import { randomUUID } from 'crypto'
import { bucket } from './firebase'


export const legacyGcsUrl = (dest) =>
  `https://storage.googleapis.com/${bucket.name}/${dest}`

export const downloadUrl = (dest, token) => {
  const encoded = encodeURIComponent(dest)
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`
}

export const uploadFile = async (dest, bytes, contentType) => {
  const token = randomUUID()
  const storageRef = bucket.file(dest)
  await storageRef.save(bytes, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token
      }
    }
  })
  return downloadUrl(dest, token)
}

export const ensureDownloadUrl = async (dest) => {
  const storageRef = bucket.file(dest)
  const [exists] = await storageRef.exists()
  if (!exists) return null

  const [meta] = await storageRef.getMetadata()
  const { metadata = {} } = meta || {}
  const { firebaseStorageDownloadTokens: existing } = metadata
  if (existing) {
    const token = String(existing).split(',')[0]
    return downloadUrl(dest, token)
  }

  const token = randomUUID()
  await storageRef.setMetadata({
    metadata: {
      firebaseStorageDownloadTokens: token
    }
  })
  return downloadUrl(dest, token)
}

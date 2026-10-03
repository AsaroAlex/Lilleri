import type { CacheLease, EncryptedCacheRecord, EncryptedCacheStore } from './types'

export const OFFLINE_DATABASE_NAME = 'lilleri-encrypted-read-cache-v1'
const STORE = 'ciphertext'
const KEY = 'current'

function aborted(error: DOMException | null) {
  return error?.name === 'AbortError'
}

/** One record, no plaintext, keys, auth cookies, original import files or mutation queue. */
export function createIndexedDbCacheStore(factory: IDBFactory = indexedDB): EncryptedCacheStore {
  function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = factory.open(OFFLINE_DATABASE_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error('offline_storage_unavailable'))
      request.onblocked = () => reject(new Error('offline_storage_unavailable'))
    })
  }
  return {
    async read(lease) {
      if (!lease.isCurrent()) return null
      const db = await open()
      if (!lease.isCurrent()) {
        db.close()
        return null
      }
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readonly')
        const unlisten = lease.onCancel(() => transaction.abort())
        let result: unknown = null
        const request = transaction.objectStore(STORE).get(KEY)
        request.onsuccess = () => {
          result = request.result ?? null
        }
        transaction.oncomplete = () => {
          unlisten()
          db.close()
          resolve(lease.isCurrent() ? result : null)
        }
        transaction.onabort = () => {
          unlisten()
          db.close()
          if (aborted(transaction.error) || !lease.isCurrent()) resolve(null)
          else reject(new Error('offline_storage_unavailable'))
        }
        transaction.onerror = () => {}
      })
    },
    async write(record: EncryptedCacheRecord, lease: CacheLease) {
      if (!lease.isCurrent()) return false
      const db = await open()
      if (!lease.isCurrent()) {
        db.close()
        return false
      }
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite')
        const unlisten = lease.onCancel(() => transaction.abort())
        const store = transaction.objectStore(STORE)
        const current = store.get(KEY)
        let written = false
        current.onsuccess = () => {
          if (!lease.isCurrent()) {
            transaction.abort()
            return
          }
          const existing = current.result as Partial<EncryptedCacheRecord> | undefined
          // Concurrent encryptions may finish in reverse order: preserve the newer snapshot.
          if (
            existing?.authorizationId === record.authorizationId &&
            typeof existing.sequence === 'number' &&
            existing.sequence >= record.sequence
          )
            return
          store.put(record, KEY)
          written = true
        }
        transaction.oncomplete = () => {
          unlisten()
          db.close()
          resolve(written && lease.isCurrent())
        }
        transaction.onabort = () => {
          unlisten()
          db.close()
          if (aborted(transaction.error) || !lease.isCurrent()) resolve(false)
          else reject(new Error('offline_storage_unavailable'))
        }
        transaction.onerror = () => {}
      })
    },
    async clear(authorizationId) {
      const db = await open()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite')
        const store = transaction.objectStore(STORE)
        if (authorizationId === undefined) store.delete(KEY)
        else {
          const current = store.get(KEY)
          current.onsuccess = () => {
            if (current.result?.authorizationId === authorizationId) store.delete(KEY)
          }
        }
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
        transaction.onabort = () => {
          db.close()
          reject(new Error('offline_storage_unavailable'))
        }
        transaction.onerror = () => {}
      })
    },
  }
}

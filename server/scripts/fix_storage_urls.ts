import { productService } from '../lib/products'
import { ensureDownloadUrl, legacyGcsUrl } from '../lib/storage'

const PAGE_SIZE = 100
const dest = process.argv[2]

const URL_FIELDS = ['imageUrl', 'modelGlbUrl', 'modelBundleUrl']

const run = async () => {
  if (!dest) {
    console.log('Usage: tsx scripts/fix_storage_urls.ts <storage-path>')
    console.log('Example: tsx scripts/fix_storage_urls.ts images/b985c990dbd84924d109b4d25ba5810f8129d55c.jpg')
    process.exit(1)
  }

  const newUrl = await ensureDownloadUrl(dest)
  if (!newUrl) {
    console.log('Not found:', dest)
    console.log('Done. Updated 0 product(s).')
    return
  }

  const oldUrl = legacyGcsUrl(dest)
  console.log('Fixed:', dest)
  console.log('  New URL:', newUrl)

  let lastId = null
  let updated = 0

  while (true) {
    const products = await productService.list({
      pageSize: PAGE_SIZE,
      ...(lastId ? { lastId } : {})
    })

    if (!products.length) break

    for (const product of products) {
      const patch = {}
      for (const field of URL_FIELDS) {
        if (product[field] === oldUrl) patch[field] = newUrl
      }
      if (Object.keys(patch).length) {
        await productService.update(product.id, patch)
        console.log('  Updated product:', product.id)
        updated++
      }
    }

    lastId = products[products.length - 1].id
    if (products.length < PAGE_SIZE) break
  }

  console.log(`Done. Updated ${updated} product(s).`)
}

run()

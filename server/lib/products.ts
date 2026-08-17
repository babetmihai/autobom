import { createServices } from './services'
import { TProductStatus } from './status'


export const PRODUCT_SEARCH_FIELDS = ['title', 'subtitle', 'sku', 'color', 'tags']
export const PRODUCT_TAGS = [
  'chair',
  'armchair',
  'sofa',
  'sectional',
  'stool',
  'bench',
  'ottoman',
  'table',
  'desk',
  'coffee table',
  'dining table',
  'side table',
  'console',
  'nightstand',
  'cabinet',
  'dresser',
  'wardrobe',
  'shelf',
  'bookcase',
  'sideboard',
  'bed',
  'headboard',
  'mirror',
  'lamp',
  'pendant',
  'chandelier',
  'rug',
  'planter',
  'wood',
  'metal',
  'fabric',
  'leather',
  'velvet',
  'linen',
  'rattan',
  'wicker',
  'glass',
  'marble',
  'stone',
  'ceramic',
  'concrete',
  'upholstered',
  'modern',
  'industrial',
  'mid-century',
  'minimalist',
  'traditional',
  'rustic'
]

export const PRODUCT_SOURCE = {
  URL: "URL"
} as const

export type TProductSource = typeof PRODUCT_SOURCE[keyof typeof PRODUCT_SOURCE]

export type TProduct = {
  id: string
  createdBy: string
  name: string
  title: string
  description: string
  sku: string
  price: string
  productUrl: string
  storeName: string
  source?: TProductSource | string
  sourceUrl?: string
  imageUrl: string
  status: TProductStatus
  tags?: Record<string, string>
  color?: string
  dimensions?: { width?: number, height?: number, depth?: number }
  embedding?: unknown
  trellisRequestId?: string
  modelGlbUrl?: string
  hasGlb?: string
  modelBundleUrl?: string
  hasBundle?: string
}

export const hasDimensions = (dimensions: Record<string, unknown> | null | undefined) => {
  if (!dimensions) return false
  const { width, height, depth } = dimensions
  return width != null || height != null || depth != null
}

export const productService = createServices('products', { searchFields: PRODUCT_SEARCH_FIELDS })

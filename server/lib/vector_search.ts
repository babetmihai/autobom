import { FieldPath, FieldValue } from 'firebase-admin/firestore'
import { TRUE } from './index'
import { STEP_STATUS } from './status'
import { versionRef } from './firebase'


export const EMBEDDING_DIMENSION = 512
export const MATCH_LIMIT = 5
export const MATCH_MIN_SCORE = 0.51

export type TProductMatch = {
  productId: string
  score: number
}

type TFindSimilarOptions = {
  limit?: number
  minScore?: number
  createdBy: string
}

export const embeddingVector = (values: number[]) => FieldValue.vector(values)

export const findSimilarProducts = async (
  queryVector: number[],
  {
    limit = MATCH_LIMIT,
    minScore = MATCH_MIN_SCORE,
    createdBy
  }: TFindSimilarOptions
): Promise<TProductMatch[]> => {
  const snapshot = await versionRef.collection('products')
    .where('createdBy', '==', createdBy)
    .where('_active', '==', TRUE)
    .where(new FieldPath('status', 'embedding'), '==', STEP_STATUS.COMPLETED)
    .findNearest({
      vectorField: 'embedding',
      queryVector,
      limit,
      distanceMeasure: 'DOT_PRODUCT',
      distanceResultField: 'vector_distance',
      distanceThreshold: minScore
    })
    .get()

  return snapshot.docs.flatMap((doc) => {
    const score = doc.get('vector_distance') as number
    if (score < minScore) return []
    return [{ productId: doc.id, score }]
  })
}

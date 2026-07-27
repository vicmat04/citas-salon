export type ActionErrorCode =
  | 'VALIDATION'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'INTERNAL'

export type ActionResult =
  | { ok: true }
  | {
      ok: false
      code: ActionErrorCode
      message: string
      fieldErrors?: Record<string, string[]>
    }

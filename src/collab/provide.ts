import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import { inject, provide, type InjectionKey } from 'vue'

export type CollabCtx = {
  doc: Y.Doc
  awareness: Awareness
  destroy: () => void
}

const KEY: InjectionKey<CollabCtx> = Symbol('collab')

export function provideCollab(ctx: CollabCtx) {
  provide(KEY, ctx)
}

export function useCollab(): CollabCtx | undefined {
  return inject(KEY)
}

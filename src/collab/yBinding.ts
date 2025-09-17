// src/collab/yBinding.ts
import * as Y from 'yjs'
import { useDashStore } from '@/stores/dashboard'

export function bindYToPinia(doc: Y.Doc) {
  const dash = useDashStore()
  const root = doc.getMap('state')
  
  if (!root.has('dashboards')) root.set('dashboards', new Y.Map())
  if (!root.has('widgets'))    root.set('widgets', new Y.Map())
  if (!root.has('views'))      root.set('views', new Y.Map())

  const yDashboards = root.get('dashboards') as Y.Map<any>
  const yWidgets    = root.get('widgets') as Y.Map<any>
  const yViews      = root.get('views') as Y.Map<any>

  const pushAll = () => {
    dash.dashboards = yDashboards.toJSON()
    dash.widgets    = yWidgets.toJSON()
    dash.views      = yViews.toJSON()
  }

  pushAll()

  const obs = () => pushAll()
  yDashboards.observeDeep(obs)
  yWidgets.observeDeep(obs)
  yViews.observeDeep(obs)

  function updateViewState(viewId: string, patch: Record<string, any>) {
    doc.transact(() => {
      let v = yViews.get(viewId) as Y.Map<any>
      if (!v) { v = new Y.Map(); yViews.set(viewId, v) }
      let s = v.get('state') as Y.Map<any>
      if (!s) { s = new Y.Map(); v.set('state', s) }
      for (const [k, val] of Object.entries(patch)) s.set(k, val)
    })
  }

  function renameWidget(widgetId: string, title: string) {
    doc.transact(() => {
      let w = yWidgets.get(widgetId) as Y.Map<any>
      if (!w) { w = new Y.Map(); yWidgets.set(widgetId, w) }
      w.set('title', title)
    })
  }

  return { updateViewState, renameWidget, destroy() {
    yDashboards.unobserveDeep(obs)
    yWidgets.unobserveDeep(obs)
    yViews.unobserveDeep(obs)
  }}
}

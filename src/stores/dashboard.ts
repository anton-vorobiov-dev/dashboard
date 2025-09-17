// src/stores/dashboard.ts
import { defineStore } from 'pinia'
import { putMany, getAll, putOne } from '@/lib/idb'

export type ID = string
export type WidgetType = 'chart' | 'table'

export interface View {
  id: ID
  name: string
  state: {
    dateRange?: '7d' | '30d' | '90d'
    metric?: 'price' | 'volume'
  }
}
export interface Widget {
  id: ID
  dashboardId: ID
  type: WidgetType
  title: string
  viewIds: ID[]
}
export interface Dashboard {
  id: ID
  name: string
  widgetIds: ID[]
}

function clone<T>(o: T): T { return JSON.parse(JSON.stringify(o)) }
function diffObjects(a: any, b: any, path = '', out: any[] = []): any[] {
  if (a === b) return out
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) {
    out.push({ path, from: a, to: b }); return out
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) diffObjects(a[k], b[k], path ? `${path}.${k}` : k, out)
  return out
}
const isEqual = (a: any, b: any) => diffObjects(a, b).length === 0

export const useDashStore = defineStore('dash', {
  state: () => ({
    dashboards: {} as Record<ID, Dashboard>,
    widgets: {} as Record<ID, Widget>,
    views: {} as Record<ID, View>,

    snapshots: {
      dashboards: {} as Record<ID, Dashboard>,
      widgets: {} as Record<ID, Widget>,
      views: {} as Record<ID, View>
    },

    saving: {
      dashboard: {} as Record<ID, boolean>,
      widget: {} as Record<ID, boolean>,
      view: {} as Record<ID, boolean>
    },

    _bootstrapped: false
  }),

  getters: {
    dashboard: (s) => (id: ID) => s.dashboards[id],
    widget: (s) => (id: ID) => s.widgets[id],
    view: (s) => (id: ID) => s.views[id],
    widgetViews: (s) => (widgetId: ID) => (s.widgets[widgetId]?.viewIds || []).map((v) => s.views[v]),

    isViewDirty(): (id: ID) => boolean {
      return (id) => !isEqual(this.views[id], this.snapshots.views[id])
    },
    viewDiff(): (id: ID) => any[] {
      return (id) => diffObjects(this.snapshots.views[id], this.views[id])
    },

    isWidgetDirty(): (id: ID) => boolean {
      return (id) => {
        const w = this.widgets[id], ws = this.snapshots.widgets[id]
        if (!w || !ws) return false
        if (!isEqual({ ...w, viewIds: w.viewIds }, { ...ws, viewIds: ws.viewIds })) return true
        return w.viewIds.some((vid) => this.isViewDirty(vid))
      }
    },
    widgetDiff(): (id: ID) => any[] {
      return (id) => {
        const base = diffObjects(this.snapshots.widgets[id], this.widgets[id])
        for (const vid of this.widgets[id]?.viewIds || []) {
          const vd = this.viewDiff(vid)
          if (vd.length) base.push({ path: `views.${vid}`, changes: vd })
        }
        return base
      }
    },

    isDashboardDirty(): (id: ID) => boolean {
      return (id) => {
        const d = this.dashboards[id], ds = this.snapshots.dashboards[id]
        if (!d || !ds) return false
        if (!isEqual({ ...d, widgetIds: d.widgetIds }, { ...ds, widgetIds: ds.widgetIds })) return true
        return d.widgetIds.some((wid) => this.isWidgetDirty(wid))
      }
    },
    countDirtyWidgets(): (dashboardId: ID) => number {
      return (dashboardId) =>
        this.dashboards[dashboardId]?.widgetIds.filter((wid) => this.isWidgetDirty(wid)).length || 0
    }
  },

  actions: {
    // -------- Bootstrap / Seed / Hydrate ----------
    async bootstrap() {
      if (this._bootstrapped) return
      // Спробуємо витягти стан із IndexedDB
      const [d, w, v, sd, sw, sv] = await Promise.all([
        getAll<Dashboard>('dashboards'),
        getAll<Widget>('widgets'),
        getAll<View>('views'),
        getAll<Dashboard>('snapshot_dashboards'),
        getAll<Widget>('snapshot_widgets'),
        getAll<View>('snapshot_views')
      ])

      const hasData = Object.keys(d).length || Object.keys(w).length || Object.keys(v).length
      if (hasData) {
        this.dashboards = d
        this.widgets = w
        this.views = v
        this.snapshots.dashboards = sd
        this.snapshots.widgets = sw
        this.snapshots.views = sv
      } else {
        // seed demo
        const d1: Dashboard = { id: 'd1', name: 'My Dashboard', widgetIds: ['w1', 'w2'] }
        const w1: Widget = { id: 'w1', dashboardId: 'd1', type: 'chart', title: 'AAPL Price', viewIds: ['v1','v2'] }
        const w2: Widget = { id: 'w2', dashboardId: 'd1', type: 'chart', title: 'MSFT Volume', viewIds: ['v3'] }
        const v1: View = { id: 'v1', name: 'Last 7d',  state: { dateRange: '7d',  metric: 'price' } }
        const v2: View = { id: 'v2', name: 'Last 30d', state: { dateRange: '30d', metric: 'price' } }
        const v3: View = { id: 'v3', name: 'Last 90d', state: { dateRange: '90d', metric: 'volume' } }

        this.dashboards[d1.id] = d1
        this.widgets[w1.id] = w1
        this.widgets[w2.id] = w2
        this.views[v1.id] = v1
        this.views[v2.id] = v2
        this.views[v3.id] = v3

        this.snapshots.dashboards[d1.id] = clone(d1)
        this.snapshots.widgets[w1.id] = clone(w1)
        this.snapshots.widgets[w2.id] = clone(w2)
        this.snapshots.views[v1.id] = clone(v1)
        this.snapshots.views[v2.id] = clone(v2)
        this.snapshots.views[v3.id] = clone(v3)

        // початковий запис у IndexedDB
        await Promise.all([
          putMany('dashboards', this.dashboards),
          putMany('widgets', this.widgets),
          putMany('views', this.views),
          putMany('snapshot_dashboards', this.snapshots.dashboards),
          putMany('snapshot_widgets', this.snapshots.widgets),
          putMany('snapshot_views', this.snapshots.views),
        ])
      }
      this._bootstrapped = true
    },

    // -------- Mutations + persist ----------
    async updateViewState(viewId: ID, patch: Partial<View['state']>) {
      const v = this.views[viewId]
      if (!v) return
      const updated: View = { ...v, state: { ...v.state, ...patch } }
      this.views[viewId] = updated
      // persist view
      await putOne('views', viewId, updated)
    },

    async renameWidget(widgetId: ID, title: string) {
      const w = this.widgets[widgetId]
      if (!w) return
      const updated: Widget = { ...w, title }
      this.widgets[widgetId] = updated
      await putOne('widgets', widgetId, updated)
    },

    markSaved(type: 'dashboard' | 'widget' | 'view', id: ID) {
      if (type === 'dashboard') this.snapshots.dashboards[id] = clone(this.dashboards[id])
      if (type === 'widget') this.snapshots.widgets[id] = clone(this.widgets[id])
      if (type === 'view') this.snapshots.views[id] = clone(this.views[id])
    },

    async saveWidget(widgetId: ID) {
      this.saving.widget[widgetId] = true
      try {
        // (опційно) подивитись що саме зберігаємо
        // const payload = this.widgetDiff(widgetId)

        // імітуємо API-запит
        await new Promise((r) => setTimeout(r, 250))

        // оновлюємо snapshots у пам'яті
        this.markSaved('widget', widgetId)
        for (const vid of this.widgets[widgetId].viewIds) this.markSaved('view', vid)

        // persist snapshots в IndexedDB
        await Promise.all([
          putOne('snapshot_widgets', widgetId, this.snapshots.widgets[widgetId]),
          ...this.widgets[widgetId].viewIds.map((vid) =>
            putOne('snapshot_views', vid, this.snapshots.views[vid])
          )
        ])
      } catch (err) {
        console.error('[saveWidget] failed:', err)
      } finally {
        // ГАРАНТОВАНО зупиняємо лоадер, навіть якщо були помилки
        this.saving.widget[widgetId] = false
      }
    },

    async saveDashboard(dashboardId: ID) {
      this.saving.dashboard[dashboardId] = true
      try {
        // const diffs = this.dashboards[dashboardId].widgetIds.map((wid) => ({ widgetId: wid, changes: this.widgetDiff(wid) }))
        await new Promise((r) => setTimeout(r, 350))

        // оновлюємо snapshots у пам'яті
        this.markSaved('dashboard', dashboardId)
        for (const wid of this.dashboards[dashboardId].widgetIds) {
          this.markSaved('widget', wid)
          for (const vid of this.widgets[wid].viewIds) this.markSaved('view', vid)
        }

        // persist snapshots в IndexedDB
        await Promise.all([
          putOne('snapshot_dashboards', dashboardId, this.snapshots.dashboards[dashboardId]),
          ...this.dashboards[dashboardId].widgetIds.map((wid) =>
            putOne('snapshot_widgets', wid, this.snapshots.widgets[wid])
          ),
          ...this.dashboards[dashboardId].widgetIds.flatMap((wid) =>
            this.widgets[wid].viewIds.map((vid) =>
              putOne('snapshot_views', vid, this.snapshots.views[vid])
            )
          )
        ])
      } catch (err) {
        console.error('[saveDashboard] failed:', err)
      } finally {
        this.saving.dashboard[dashboardId] = false
      }
    },

    // опційно: створення нового віджета, теж одразу пишемо в IDB
    async addWidget(dashboardId: ID, payload: { type: WidgetType; title: string; view?: Partial<View> }) {
      const id = crypto.randomUUID()
      const viewId = crypto.randomUUID()
      const v: View = { id: viewId, name: payload.view?.name ?? 'New view', state: { dateRange: '7d', metric: 'price', ...payload.view?.state } }
      const w: Widget = { id, dashboardId, type: payload.type, title: payload.title, viewIds: [viewId] }

      this.views[viewId] = v
      this.widgets[id] = w
      this.dashboards[dashboardId].widgetIds.push(id)

      // persist current
      await Promise.all([
        putOne('views', viewId, v),
        putOne('widgets', id, w),
        putOne('dashboards', dashboardId, this.dashboards[dashboardId])
      ])
      // початкові snapshots
      this.snapshots.views[viewId] = clone(v)
      this.snapshots.widgets[id] = clone(w)
      await Promise.all([
        putOne('snapshot_views', viewId, this.snapshots.views[viewId]),
        putOne('snapshot_widgets', id, this.snapshots.widgets[id])
      ])
      return id
    },

    async resetWidget(widgetId: ID) {
      const ws = this.snapshots.widgets[widgetId]
      if (!ws) return

      // відновлюємо сам віджет (title, type, viewIds ...)
      this.widgets[widgetId] = JSON.parse(JSON.stringify(ws))

      // відновлюємо всі view цього віджета зі знімків
      for (const vid of ws.viewIds) {
        const vs = this.snapshots.views[vid]
        if (vs) this.views[vid] = JSON.parse(JSON.stringify(vs))
      }

      // persist у IndexedDB (поточний стан; snapshots не чіпаємо)
      await putOne('widgets', widgetId, this.widgets[widgetId])
      await Promise.all(
        ws.viewIds.map((vid) => putOne('views', vid, this.views[vid]))
      )
    },

    async resetDashboard(dashboardId: ID) {
      const ds = this.snapshots.dashboards[dashboardId]
      if (!ds) return

      // відновлюємо дашборд (назва, список віджетів)
      this.dashboards[dashboardId] = JSON.parse(JSON.stringify(ds))
      await putOne('dashboards', dashboardId, this.dashboards[dashboardId])

      // відновлюємо кожен віджет та його view зі знімків
      for (const wid of ds.widgetIds) {
        const ws = this.snapshots.widgets[wid]
        if (!ws) continue
        this.widgets[wid] = JSON.parse(JSON.stringify(ws))
        await putOne('widgets', wid, this.widgets[wid])

        for (const vid of ws.viewIds) {
          const vs = this.snapshots.views[vid]
          if (vs) {
            this.views[vid] = JSON.parse(JSON.stringify(vs))
            await putOne('views', vid, this.views[vid])
          }
        }
      }
    },
  }
})

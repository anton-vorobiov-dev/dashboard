// Автоматичні “саванні” імена + колір для юзерів (збереження в sessionStorage)

import { nanoid } from 'nanoid'

const ANIMALS = [
  'Lion','Cheetah','Leopard','Elephant','Giraffe','Zebra','Hyena','Wildebeest','Gazelle',
  'Impala','Kudu','Oryx','Springbok','Warthog','Meerkat','Ostrich','Baboon','Hippo',
  'Jackal','Serval','Caracal','Honey Badger','Civet','Bushbaby'
]

const ADJ = [
  'Swift','Calm','Brave','Quiet','Bold','Lucky','Sunny','Dancing','Mighty','Gentle',
  'Clever','Nimble','Sandy','Amber','Ivory','Sable'
]

const COLORS = [
  '#10b981','#3b82f6','#a855f7','#ef4444','#f59e0b',
  '#14b8a6','#f97316','#22c55e','#6366f1'
]

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }

export type Identity = { id: string; name: string; color: string }

const KEY = 'collab:identity'

export function getOrCreateIdentity(): Identity {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Identity
  } catch (_) {  }

  const id = nanoid()
  const name = `${pick(ADJ)} ${pick(ANIMALS)}`
  const color = pick(COLORS)
  const ident: Identity = { id, name, color }

  try { sessionStorage.setItem(KEY, JSON.stringify(ident)) } catch (_) {}
  return ident
}

export function initials(name: string) {
  return name?.trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}

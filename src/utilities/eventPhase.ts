export type EventPhase = 'upcoming' | 'active' | 'finished'

export function getEventPhase(startDate: string, endDate: string, now = Date.now()): EventPhase {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return 'active'
  if (now < start) return 'upcoming'
  if (now > end) return 'finished'
  return 'active'
}

export type PodiumPlace = {
  place: 1 | 2 | 3
  medal: string
  label: string
  count: number
  members: { memberId: string; memberName: string }[]
}

const MEDALS = [
  { place: 1 as const, medal: '🥇', label: '1st' },
  { place: 2 as const, medal: '🥈', label: '2nd' },
  { place: 3 as const, medal: '🥉', label: '3rd' },
]

/** Dense ranking by entry count: ties share a place; next distinct score is the next place. */
export function buildPodium(
  rows: { memberId: string; memberName: string; count: number }[],
): PodiumPlace[] {
  const ranked = [...rows]
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.memberName.localeCompare(b.memberName))

  if (!ranked.length) return []

  const places: PodiumPlace[] = []
  let index = 0

  for (const meta of MEDALS) {
    if (index >= ranked.length) break
    const count = ranked[index]!.count
    const members = []
    while (index < ranked.length && ranked[index]!.count === count) {
      members.push({
        memberId: ranked[index]!.memberId,
        memberName: ranked[index]!.memberName,
      })
      index++
    }
    places.push({
      place: meta.place,
      medal: meta.medal,
      label: meta.label,
      count,
      members,
    })
  }

  return places
}

import 'dotenv/config'
import { getPayload } from 'payload'
import config from './payload.config'

function daysFromNow(days: number, hours = 12): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hours, 0, 0, 0)
  return d.toISOString()
}

function lexicalParagraph(text: string) {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
              version: 1,
            },
          ],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
        },
      ],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

const MEMBER_NAMES = ['Alex', 'Jordan', 'Sam', 'Riley', 'Casey'] as const

const ENTRY_TEMPLATES = [
  { description: 'Morning run around the lake — felt strong.', durationMinutes: 35 },
  { description: 'Push day: bench, overhead press, triceps.', durationMinutes: 55 },
  { description: 'Yoga flow + mobility work.', durationMinutes: 40 },
  { description: 'HIIT session. Legs are toast.', durationMinutes: 25 },
  { description: 'Long walk with a heavy backpack.', durationMinutes: 60 },
  { description: 'Pull day: rows, pull-ups, biceps.', durationMinutes: 50 },
  { description: 'Swim — easy pace, focused on technique.', durationMinutes: 45 },
  { description: 'Core circuit + stretching.', durationMinutes: 20 },
  { description: 'Bike ride to the market and back.', durationMinutes: 30 },
  { description: 'Leg day: squats, lunges, calf raises.', durationMinutes: 65 },
  { description: 'Evening jog after work.', durationMinutes: 28 },
  { description: 'Full-body dumbbell circuit at home.', durationMinutes: 40 },
]

async function seed() {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'events',
    where: { slug: { equals: 'summer-grind' } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    console.log('Seed already applied (event slug "summer-grind" exists). Skipping.')
    console.log('Unlock code: grind2026')
    console.log('Open: /events/summer-grind')
    process.exit(0)
  }

  console.log('Creating members…')
  const members = []
  for (const name of MEMBER_NAMES) {
    const member = await payload.create({
      collection: 'members',
      data: { name },
      overrideAccess: true,
    })
    members.push(member)
    console.log(`  ✓ ${name} (${member.id})`)
  }

  console.log('Creating event…')
  const event = await payload.create({
    collection: 'events',
    data: {
      title: 'Summer Grind',
      slug: 'summer-grind',
      description: lexicalParagraph(
        'Two-week fitness challenge. Log every workout. Lowest ranked buys dinner.',
      ),
      startDate: daysFromNow(-7),
      endDate: daysFromNow(14),
      accessCode: 'grind2026',
      rankingEnabled: true,
      members: members.map((m) => m.id),
    },
    overrideAccess: true,
  })
  console.log(`  ✓ ${event.title} (${event.id}) → /events/${event.slug}`)

  console.log('Creating entries…')
  for (let i = 0; i < ENTRY_TEMPLATES.length; i++) {
    const template = ENTRY_TEMPLATES[i]!
    const member = members[i % members.length]!
    const entry = await payload.create({
      collection: 'entries',
      data: {
        event: event.id,
        member: member.id,
        loggedAt: daysFromNow(-6 + Math.floor(i / 2), 7 + (i % 10)),
        description: template.description,
        durationMinutes: template.durationMinutes,
      },
      overrideAccess: true,
    })
    console.log(`  ✓ ${member.name}: ${template.description.slice(0, 40)}… (${entry.id})`)
  }

  console.log('\nSeed complete.')
  console.log('  Event:  /events/summer-grind')
  console.log('  Access: grind2026')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

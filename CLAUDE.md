# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Nyenrode Examenplanning (v2)

> Instructiebestand voor Claude Code. Elke sectie stuurt concreet gedrag.
> Taal van de app: **Nederlands** (UI, DB-kolommen, variabelenamen).
> Taal van dit bestand: **Nederlands**.

---

## 1. PROJECT CONTEXT

### Wat dit is
Examenplanningssysteem voor Nyenrode Business University. Planners, coördinatoren en surveillanten werken samen om tentamens te plannen in Breukelen en Amsterdam.

### Wat er oud was (referentie: `nyenrode-examenplanning-old/`)
- Python + Streamlit (multi-page app)
- SQLite zonder ORM
- Twee aparte constraint-engines (inconsistent)
- Geen echte authenticatie (honor-system)
- Hardcoded reference-data in `utils/data.py`
- Greedy auto-plan zonder voorkeur-logica
- Session-state/database sync-problemen

### Wat dit project is
Volledige herbouw in **Node.js / Next.js 15**. Zelfde domein, zelfde constraints, betere architectuur.

---

## 2. TECH STACK (NIET ONDERHANDELEN)

| Laag | Keuze | Reden |
|------|-------|-------|
| Framework | **Next.js 15** (App Router) | SSR, API routes, file-based routing |
| Taal | **TypeScript** (strict mode) | Type-safety, IDE support |
| Database | **SQLite** via **@libsql/client** | Lokaal (`file:`) + Turso-compatibel voor productie (geen native compile nodig) |
| ORM | **Drizzle ORM** | Type-safe, SQL-dicht, geen magie |
| UI | **shadcn/ui** + **Tailwind CSS** | Composable components |
| Auth | **NextAuth.js v5** | Role-based, Credentials provider |
| Kalender | **react-big-calendar** of **FullCalendar** | Drag-and-drop slots |
| Export | **ExcelJS** | xlsx-export (Facilitor + matrix) |
| Import | **xlsx** (SheetJS) | Chrono-format parsing |
| State | **TanStack Query** | Server-state caching |
| Validatie | **Zod** | Schema-validatie API + forms |
| Tests | **Vitest** + **Playwright** | Unit + E2E |
| Hosting | **Vercel** | GitHub koppeling, gratis tier |

### Nooit vervangen door:
- `any` in TypeScript
- `fetch()` zonder Zod-validatie op de response
- `console.log` als debugging-methode in productie
- Direct SQL-strings samenstellen (altijd via Drizzle)
- `better-sqlite3` (vereist Visual Studio op Windows — gebruik `@libsql/client`)

---

## 3. MAPSTRUCTUUR

```
nyenrode-examenplanning-new/
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          # Shell met nav + auth-check
│   │   ├── kalender/page.tsx
│   │   ├── examens/page.tsx
│   │   ├── surveillanten/page.tsx
│   │   └── rapporten/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── examens/route.ts
│       ├── slots/route.ts
│       ├── toewijzingen/route.ts
│       ├── surveillanten/route.ts
│       └── auto-plan/route.ts
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── kalender/               # Kalendercomponenten
│   ├── examens/                # Examen-gerelateerde UI
│   └── surveillanten/          # Surveillant-UI
├── lib/
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema (single source of truth)
│   │   ├── index.ts            # DB-verbinding
│   │   └── seed.ts             # Seed-data (vervangt hardcoded utils/data.py)
│   ├── constraints/
│   │   ├── index.ts            # Constraint-engine (ENIGE constraint-file)
│   │   └── types.ts            # ConstraintResult, Blokkade, Waarschuwing
│   ├── algorithm/
│   │   └── auto-plan.ts        # Greedy + voorkeur-logica
│   ├── export/
│   │   ├── facilitor.ts        # Facilitor Excel-export
│   │   └── surveillanten.ts    # Surveillanten-matrix export
│   ├── import/
│   │   └── chrono.ts           # Chrono Excel-import
│   └── auth/
│       └── config.ts           # NextAuth config + rollen
├── types/
│   └── domain.ts               # Gedeelde TypeScript interfaces
├── drizzle/
│   └── migrations/             # Drizzle migratie-bestanden
├── public/
├── tests/
│   ├── unit/
│   └── e2e/
├── drizzle.config.ts
├── next.config.ts
├── package.json
└── CLAUDE.md                   # Dit bestand
```

---

## 4. DOMEINMODEL (ENIGE WAARHEID)

### Entiteiten

```typescript
// types/domain.ts

type Status = 'concept' | 'ingediend' | 'gepland' | 'bevestigd';
type Tijdblok = 'ochtend' | 'middag' | 'avond';
type Campus = 'Breukelen' | 'Amsterdam';
type Rol = 'planner' | 'hoofd_operations' | 'programmacoördinator' | 'surveillant' | 'examencommissie';
type ExamType = 'C' | 'H' | 'C/H' | 'H1' | 'H2' | 'H3';
type SurveillantRol = 'Surveillant' | 'Hoofdsurveillant';

interface Examen {
  id: number;
  naam: string;
  programma: string;
  afdeling?: string;
  examtype: ExamType;
  isFau: boolean;              // Landelijk tentamen → FAU-constraint
  voorkeurDatum?: string;      // ISO date
  voorkeurWeek?: number;
  voorkeurTijdblok?: Tijdblok;
  duurMinuten: number;
  geschatAantal: number;
  locatieVoorkeur?: Campus;
  format?: string;             // Cirrus / Papier
  bijlageVereist: boolean;
  nieuweStudenten: boolean;
  contactpersoon?: string;
  budgetnummer?: string;
  opmerkingen?: string;
  status: Status;
  ingediendDoor?: string;
  aangemaaktOp: Date;
}

interface Locatie {
  id: number;
  naam: string;
  campus: Campus;
  capaciteit: number;
  isPrimair: boolean;
  voorkeurVolgorde: number;
}

interface Slot {
  id: number;
  datum: string;               // ISO date YYYY-MM-DD
  tijdblok: Tijdblok;
  startTijd: string;           // HH:MM
  eindTijd: string;            // HH:MM
  locatieId: number;
  geblokkeerd: boolean;
  blokReden?: string;
}

interface Toewijzing {
  id: number;
  examenId: number;
  slotId: number;
  halveZaal: boolean;
  aangemeldDoor: string;
  aangemeldOp: Date;
  overrideReden?: string;
}

interface Surveillant {
  id: number;
  naam: string;
  email: string;
  kanHs: boolean;
  kanSurv: boolean;
  actief: boolean;
}
```

### Tijdblokken (hardcoded constants, nooit wijzigen zonder overleg)
```
ochtend: 09:30–13:00
middag:  14:00–17:30
avond:   19:00–22:30
```

### Locaties (seed-data, niet hardcoded in logica)
```
Breukelen:
- Sporthal heel:  350 studenten (isPrimair: true)
- Sporthal half:  175 studenten (virtueel, geen eigen locatie-record)
- DR02/03:         30 studenten
- Collegezaal J:   30 studenten

Amsterdam:
- 1.06/1.07:       85 studenten
```

---

## 5. CONSTRAINT-ENGINE (KRITISCH)

### Eén engine, één bestand: `lib/constraints/index.ts`

Er bestaat **nooit** een tweede constraint-file. Alle constraint-checks gaan via:

```typescript
// lib/constraints/types.ts
interface ConstraintResult {
  ok: boolean;
  blokkades: string[];      // Harde fouten — planning niet mogelijk
  waarschuwingen: string[]; // Zachte fouten — planning mogelijk met override
  halvezaalSuggestie: boolean;
}

// lib/constraints/index.ts
function checkAlleConstraints(
  examen: Examen,
  slot: Slot,
  locatie: Locatie,
  andereExamensInSlot: Examen[],
  andereExamensOpDag: { slot: Slot; examen: Examen }[],
  override: boolean
): ConstraintResult
```

### De vijf constraints (implementeer exact zo):

#### 1. Capaciteitsconstraint
- `examen.geschatAantal > locatie.capaciteit` → **blokkade**
- `examen.geschatAantal > locatie.capaciteit * 0.90` → **waarschuwing**
- `examen.geschatAantal <= locatie.capaciteit / 2` (Sporthal heel) → **halvezaalSuggestie: true**

#### 2. FAU-isolatieconstraint
- Als `examen.isFau === true`:
  - Slot mag geen andere examens bevatten → **blokkade als niet leeg**
  - Alle andere slots op dezelfde dag op Breukelen worden geblokkeerd → **blokkade**
  - FAU-examen MOET in ochtendblok → **blokkade als tijdblok !== 'ochtend'**

#### 3. Ochtendblok-restrictie (Breukelen)
- Maandag (1), Dinsdag (2), Vrijdag (5) ochtend → **blokkade**
- Tenzij: slot.datum valt in een `academische_kalender` week voor het programma van het examen
- Check via `isExamenweek(datum: string, programma: string): boolean`

#### 4. HS-ratio-waarschuwing
- `hsBenodigd = Math.ceil(andereExamensInSlot.length / 2)`
- `hsBenodigd > 3` → **waarschuwing**
- Override: `hoofd_operations` rol

#### 5. Splitsingsconstraint
- Examen mag niet gesplitst worden over locaties → altijd één locatie per examen
- `halvezaalSuggestie` wanneer geschatAantal ≤ 175 en locatie is Sporthal heel

### Override-flow
- Alleen `hoofd_operations` mag `override: true` meesturen
- Bij override: waarschuwingen worden genegeerd, blokkades blijven blokkades
- `overrideReden` is verplicht bij override (niet leeg)

---

## 6. AUTO-PLAN ALGORITME

### Bestand: `lib/algorithm/auto-plan.ts`

```typescript
interface PlanResultaat {
  gepland: { examen: Examen; slot: Slot }[];
  nietGepland: { examen: Examen; reden: string }[];
}

function autoPlan(
  examens: Examen[],
  beschikbareSlots: Slot[],
  locaties: Locatie[],
  bestaandeToewijzingen: Toewijzing[]
): PlanResultaat
```

### Algoritme-volgorde:
1. Sorteer ongeplande examens: FAU-examens eerst, dan op `geschatAantal` DESC
2. Per examen: probeer slots in voorkeur-volgorde:
   - Voorkeur tijdblok/locatie van examen (als opgegeven) — **dit was een bug in v1, nu gefixed**
   - Fallback: middag → avond → ochtend, Breukelen heel → Amsterdam
3. Check `checkAlleConstraints(examen, slot, locatie, ..., override=false)`
4. Eerste slot dat OK is → plannen
5. Geen slot gevonden → `nietGepland` met reden

---

## 7. AUTHENTICATIE & ROLLEN

### NextAuth.js v5, Credentials provider

```typescript
// lib/auth/config.ts

const ROLLEN_PAGINAS: Record<Rol, string[]> = {
  planner:               ['kalender', 'examens', 'surveillanten', 'rapporten'],
  hoofd_operations:      ['kalender', 'examens', 'surveillanten', 'rapporten'],
  programmacoördinator:  ['kalender', 'examens'],
  surveillant:           ['beschikbaarheid'],
  examencommissie:       ['kalender', 'examens', 'rapporten'],
};

const KAN_SCHRIJVEN: Record<Rol, boolean> = {
  planner:               true,
  hoofd_operations:      true,
  programmacoördinator:  false,
  surveillant:           false,
  examencommissie:       false,
};

const KAN_OVERRIDE: Record<Rol, boolean> = {
  hoofd_operations: true,
  // rest: false
};
```

### Authenticatie-aanpak (v1 herbouw)
- Simpele pincode-login (4 cijfers) per gebruiker, opgeslagen als bcrypt-hash
- Gebruikers beheerd in de database (niet hardcoded)
- Session bevat: `{ id, naam, rol, surveillantId? }`
- API-routes valideren altijd rol via `auth()` (NextAuth helper)

---

## 8. DATABASE SCHEMA (Drizzle)

### Bestand: `lib/db/schema.ts`

Elke tabel heeft:
- `id` (integer, primary key, autoincrement)
- `aangemaaktOp` (text, ISO timestamp, default: now)
- `bijgewerktOp` (text, ISO timestamp, updated in application layer)

```typescript
// Alle tabellen:
export const locaties = sqliteTable('locaties', { ... });
export const examens = sqliteTable('examens', { ... });
export const slots = sqliteTable('slots', { ... });
export const toewijzingen = sqliteTable('toewijzingen', { ... });
export const gebruikers = sqliteTable('gebruikers', { ... });  // NIEUW
export const surveillanten = sqliteTable('surveillanten', { ... });
export const beschikbaarheid = sqliteTable('beschikbaarheid', { ... });
export const survToewijzingen = sqliteTable('surv_toewijzingen', { ... });
export const academischeKalender = sqliteTable('academische_kalender', { ... });
```

### Migraties
- **Altijd**: `npx drizzle-kit generate` → commit de migratiebestanden
- **Nooit**: direct SQL uitvoeren op de database zonder migratie
- Bij seed-data wijzigingen: update `lib/db/seed.ts`, niet `schema.ts`

---

## 9. API ROUTES CONVENTIES

```
GET    /api/examens              → lijst (met filters: status, programma)
POST   /api/examens              → nieuw examen
GET    /api/examens/[id]         → detail
PATCH  /api/examens/[id]         → update (status, velden)
DELETE /api/examens/[id]         → verwijder (cascade toewijzingen)

POST   /api/toewijzingen         → plan examen in slot
DELETE /api/toewijzingen/[id]    → verwijder toewijzing

POST   /api/auto-plan            → run auto-plan algoritme

GET    /api/slots                → lijst (met datum-range filter)
POST   /api/slots/blokkeer       → blokkeer slot

GET    /api/surveillanten        → lijst
POST   /api/beschikbaarheid      → sla beschikbaarheid op (surveillant)
GET    /api/beschikbaarheid/matrix → matrix voor planner

POST   /api/export/facilitor     → Excel download
POST   /api/export/surveillanten → Excel download
POST   /api/import/chrono        → Excel upload (Chrono-formaat)
```

### Response-formaat (altijd):
```typescript
// Succes
{ data: T, meta?: { total: number, page: number } }

// Fout
{ error: string, details?: Record<string, string[]> }
```

### Validatie
- Elke POST/PATCH: Zod-schema valideren vóór DB-aanroep
- Elke GET: Query-params valideren met Zod
- Nooit: raw `req.body` gebruiken zonder validatie

---

## 10. EXPORT & IMPORT

### Facilitor Export (`lib/export/facilitor.ts`)
Kolommen (exact in deze volgorde voor Facilitor-compatibiliteit):
`Tentamen | Programma | Type | Studenten | Datum | Start | Eind | Locatie | Format | Halve zaal | Bijlage | Contactpersoon | Budgetnummer | Opmerkingen | Status | Override reden`

### Surveillanten-matrix Export (`lib/export/surveillanten.ts`)
Rijen: slots met examens. Kolommen: alle actieve surveillanten.
Waarden: `?` (open) / `S` (surveillant) / `H` (hoofdsurveillant) / `✖` (niet beschikbaar)

### Chrono Import (`lib/import/chrono.ts`)
Kolom-mapping (tolerant voor kleine variaties in kolomnamen):
```typescript
const CHRONO_MAPPING: Record<string, keyof Examen> = {
  'tentamen':           'naam',
  'programma':          'programma',
  'geschat aantal':     'geschatAantal',
  'tijd':               'voorkeurTijdblok',  // parse: 09:xx → ochtend etc.
  'bijlage':            'bijlageVereist',
  'veel nieuwe stud':   'nieuweStudenten',
};
```
- Rijen overslaan: `['1e kerstdag', '2e kerstdag', 'oudjaarsdag', 'nieuwjaarsdag']`
- `'landelijk'` in naam → `isFau = true`

---

## 11. DO'S

- **Schrijf altijd in TypeScript met strict mode** — geen `// @ts-ignore`
- **Eén constraint-engine** — als je een constraint check wil toevoegen, ga naar `lib/constraints/index.ts`
- **Drizzle voor alle DB-operaties** — geen raw SQL strings
- **Zod voor alle input-validatie** — API routes én forms
- **Server Components voor data-fetching** — Client Components alleen voor interactiviteit
- **Transacties bij meerdere DB-writes** — gebruik `db.transaction()`
- **Foutmeldingen in het Nederlands** — gebruikers lezen Nederlands
- **Audit trail altijd** — elke write bevat `aangemaaktDoor`/`bijgewerktDoor`
- **Test constraints apart** — `tests/unit/constraints.test.ts` is de waarheid
- **Seed-data in `lib/db/seed.ts`** — niet hardcoded in components of logica

---

## 12. DON'TS

- **Geen session-state als data-store** — alles leeft in de database
- **Geen tweede constraint-file** — één engine, één waarheid
- **Geen `any` in TypeScript** — gebruik `unknown` + type guards als nodig
- **Geen directe SQL-strings** — alles via Drizzle
- **Geen constraint-checks in de UI** — checks horen in `lib/constraints/`
- **Geen hardcoded locaties/tijdblokken in logica** — lees uit DB of constants in `lib/db/schema.ts`
- **Geen `console.log` in productie-code** — gebruik een logger (`pino`)
- **Geen wachtwoord-velden in logs**
- **Nooit `override: true` zonder `overrideReden`**
- **Nooit cascade-delete zonder bewuste keuze** — standaard restrict, handmatig opschonen

---

## 13. ACADEMISCHE KALENDER (EXAMENWEEKS)

Configureerbaar via de database. Standaard seed voor 2026–2027:

```
BScBA:    19–23 okt, 14–18 dec, 25–29 jan, 22–26 mrt, 17–21 mei
FTMScM:   05–09 okt, 14–18 dec, 22–26 feb, 10–14 mei
PT MScM:  05–09 okt, 07–11 dec
```

Gebruik `isExamenweek(datum: string, programma: string): boolean` — query op `academische_kalender` tabel, nooit hardcoded.

---

## 14. SKILLS (CLAUDE-SPECIFIEKE WORKFLOWS)

### Nieuwe pagina toevoegen:
1. Maak page component in `app/(app)/[pagina]/page.tsx`
2. Voeg pagina toe aan `ROLLEN_PAGINAS` in `lib/auth/config.ts`
3. Voeg route toe aan navigatie in `app/(app)/layout.tsx`
4. Maak bijbehorende API-route(s) in `app/api/`

### Nieuwe constraint toevoegen:
1. Voeg check toe in `lib/constraints/index.ts`
2. Schrijf unit-test in `tests/unit/constraints.test.ts`
3. Documenteer de constraint in sectie 5 van dit bestand

### DB-kolom toevoegen:
1. Update `lib/db/schema.ts`
2. Genereer migratie: `npx drizzle-kit generate`
3. Update type in `types/domain.ts`
4. Update `lib/db/seed.ts` indien nodig

### Export aanpassen:
1. Check Facilitor-kolomvolgorde (sectie 10)
2. Test met echte Excel-download

### Iets onduidelijk over het domein:
- Raadpleeg `nyenrode-examenplanning-old/` als referentie-implementatie
- Vraag Juan — hij kent de bedrijfsregels

---

## 15. GEHEUGEN

Claude slaat op in `memory/` wanneer het leert:
- Wijzigingen in bedrijfsregels of constraint-aanpassingen
- Tech-stack beslissingen met reden
- Nyenrode-specifieke afspraken die niet in dit bestand staan
- Feedback van Juan over aanpak of output-kwaliteit

Claude slaat **niet** op in memory:
- Code-patronen (die staan in de code)
- Git-geschiedenis of recente commits
- Tijdelijke debugging-notities of in-progress werk

---

## 16. COMMANDS

```bash
# Installeren
npm install

# Development
npm run dev

# Database migratie genereren (na schema-wijziging)
npx drizzle-kit generate

# Database migratie uitvoeren
npx drizzle-kit migrate

# Database seeden
npx tsx lib/db/seed.ts

# Tests
npm test              # Vitest unit tests
npm run test:e2e      # Playwright E2E

# Build
npm run build

# Type check
npx tsc --noEmit

# Linting
npm run lint
```

---

## 17. HOSTING & INFRASTRUCTUUR

- **Platform**: Vercel (gratis tier, koppelt aan `tatesjuan/nyenrode-examenplanning-new` op GitHub)
- **Database**: SQLite lokaal (`examenplanning.db`) → bij opschaling: Turso (distributed SQLite, Drizzle-compatibel)
- **Secrets**: Vercel environment variables — nooit in code of `.env` committen
- **Branch-strategie**: `main` → Vercel production. Feature branches → preview deployments.
- **`.env.example`** altijd bijhouden met placeholder-waarden

---

## 18. REFERENTIE-ARCHITECTUUR

```
Browser
  └─ Next.js App Router
       ├─ Server Components      ← data fetching, rendering
       ├─ Client Components      ← interactiviteit, kalender, forms
       └─ API Routes
            ├─ auth              ← NextAuth.js v5
            ├─ examens           ← CRUD + Zod validatie
            ├─ toewijzingen      ← planning + constraint-check
            ├─ auto-plan         ← greedy algoritme
            ├─ surveillanten     ← beschikbaarheid + toewijzing
            └─ export/import     ← ExcelJS + SheetJS

lib/
  ├─ db/          ← Drizzle schema + verbinding + seed
  ├─ constraints/ ← Constraint-engine (ENIGE — nooit dupliceren)
  ├─ algorithm/   ← Auto-plan algoritme
  ├─ export/      ← Excel exports (Facilitor + matrix)
  ├─ import/      ← Chrono import
  └─ auth/        ← NextAuth config + rollen + helpers

SQLite (examenplanning.db)
  └─ 9 tabellen: locaties, examens, slots, toewijzingen, gebruikers,
                 surveillanten, beschikbaarheid, surv_toewijzingen,
                 academische_kalender
```

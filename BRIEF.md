# CheerCast — Claude Code Project Brief
## Evaluate. Build. Win.
**Version 1.0 | Gleeson Consulting | holly@gleeson-consulting.com**

---

> **INSTRUCTIONS FOR CLAUDE CODE:** Read this entire document before writing a single line of code. Once you have read it, confirm you understand the full scope, ask any clarifying questions, and then wait for Holly to say "go" before starting Phase 1 Step 1. Do not skip ahead. Do not assume. Ask if anything is unclear.

---

## SECTION 1 — PRODUCT OVERVIEW

### What CheerCast Is

CheerCast is an AI-powered athlete roster intelligence system for competitive All Star cheer gyms. It manages the full athlete lifecycle — from pre-evaluation profiles through team placement, practice scheduling, choreography planning, and competition season management — carrying all data forward year over year.

CheerCast is NOT a registration tool or billing platform. It is the operational intelligence layer that gym owners have never had: a system that knows every athlete, knows every rule, and helps make smarter decisions at every point in the season.

### Target Users

- **Primary:** Gym owners and directors (make placement and operational decisions)
- **Secondary:** Head coaches (evaluation scoring, athlete notes, routine roles)
- **Secondary:** Athletes and parents (profile input, preferences, viewing placement and schedule)
- **Secondary:** Choreographers (read-only report access)

### Business Model

- Onboarding fee per gym (one-time setup)
- Per-athlete per-month subscription (~$2-3/athlete/month)
- Design partner pricing for early adopter gyms

### Closest Competitor

CheerSync (cheersyncapp.com) — handles tryout video capture, basic skill scoring, drag-and-drop team builder, prep/elite/novice tiers. Priced $299-699/year flat rate. **Has no AI, no athlete development tracking, no year-over-year history, no replacement logic, no practice scheduling, no routine role tracking, no choreography reporting.** CheerCast starts where CheerSync ends.

### Design Standard

CheerCast must be visually polished and premium. This is a key differentiator. The UI should feel like a modern B2B SaaS product — clean, athletic, confidence-inspiring.

- **Primary color:** Navy `#1B2E4B`
- **Accent color:** Gold `#C9A84C`
- **Background:** White `#FFFFFF` and Light Gray `#F5F6F7`
- **Success:** `#22C55E` | **Warning:** `#F59E0B` | **Error:** `#EF4444` | **Info:** `#3B82F6`
- **Font:** Inter (Google Fonts)

Every screen should be something a gym director would be proud to show a parent.

---

## SECTION 2 — TECH STACK

### Core Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (functional components + hooks) + Tailwind CSS + React Router |
| Backend/Database | Supabase (PostgreSQL) with Supabase Auth and Row Level Security |
| Hosting | Netlify with netlify.toml for SPA routing |
| AI | Anthropic API — model: `claude-sonnet-4-20250514` |
| Email | Resend (resend.com) — free tier for Phase 1 |

### Environment Variables

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
RESEND_API_KEY=your_resend_api_key
```

### Project Structure

```
cheercast/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Route-level page components
│   ├── modules/          # Feature modules (eval, placement, scheduling, etc)
│   ├── lib/              # Supabase client, AI helpers
│   ├── hooks/            # Custom React hooks
│   ├── context/          # Auth context, gym context
│   └── utils/            # USASF rules engine, constraint scheduler
├── supabase/
│   └── migrations/       # All database migrations as SQL files
├── netlify.toml
└── .env.local
```

### Code Standards (Non-Negotiable)

- All components functional with hooks. No class components.
- Tailwind CSS for all styling. No inline styles except dynamic values.
- All Supabase queries go through `src/lib/supabase.js` helper functions. Never query Supabase directly from components.
- All AI calls go through `src/lib/ai.js` helper functions.
- All USASF rule checks go through `src/utils/usasf-rules.js`.
- Error handling on every async operation. User-facing error messages in plain English.
- Auto-save on all evaluation scoring. Evaluators must never lose data.

---

## SECTION 3 — USER ROLES & AUTHENTICATION

All auth is Supabase Auth. Every user belongs to a gym (`gym_id`). RLS ensures users only see their own gym's data.

| Role | Access |
|------|--------|
| `owner` | Full access to all data, all notes, AI features, billing, user management |
| `coach` | Score evals, add athlete notes (public or coaches/owner private), update routine roles, performance notes |
| `eval_only` | Can score athletes during active eval sessions only. No other access. |
| `choreographer` | Read-only access to choreography reports for assigned teams only |
| `athlete_parent` | View own athlete's profile, placement, schedule, competition calendar, public notes. Can edit own athlete's preferences and availability. Cannot see private notes. |

---

## SECTION 4 — COMPLETE DATA MODEL

> All tables include: `id` (uuid PK), `gym_id` (uuid FK to gyms), `created_at` (timestamptz), `updated_at` (timestamptz). RLS on every table restricts all operations to matching `gym_id`.

### Table: gyms
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | e.g. "Elite Force All Stars" |
| owner_name | text | |
| email | text | |
| phone | text | |
| address | text | |
| facilities | jsonb | Array: [{name, address, mat_count}] |
| elite_athlete_count | int | Auto-calculated. Flags DI/DII at >= 126 |
| subscription_tier | text | design_partner / active / inactive |
| settings | jsonb | season_start_date, eval_date, announcement_date, etc. |

### Table: athletes
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| gym_id | uuid | FK to gyms |
| first_name | text | |
| last_name | text | |
| date_of_birth | date | Auto-calculates age division (cutoff Aug 31) |
| email | text | Used for Supabase Auth invite |
| parent_name | text | |
| parent_email | text | |
| phone | text | |
| height_inches | int | Self-entered by athlete/parent |
| weight_lbs | int | Self-entered. Visible to owners/coaches only |
| still_growing | boolean | Self-reported |
| years_at_gym | int | Auto-calculated from join_date |
| join_date | date | |
| status | text | active / inactive / injured / withdrawn |
| profile_photo_url | text | |
| current_team_id | uuid | FK to teams. Null if unplaced |
| current_level | text | e.g. "2", "1.2", "3" |
| current_tier | text | elite / prep / novice |
| age_division | text | Auto-calc: tiny/mini/youth/junior/senior/open |
| notes_coach_private | text | Coaches and owners only |
| notes_owner_private | text | Owners only |
| notes_public | text | Visible to athlete/parent, coaches, owners |
| attendance_score | decimal | Auto-calculated 0-100 |
| competition_etiquette_score | decimal | Manually rated by coaches 0-100 |
| performance_badges | jsonb | Array: [{type, label, date, awarded_by}] |
| badge_bonus_points | int | Carried forward from prior season for eval weighting |

### Table: athlete_preferences
| Field | Type | Notes |
|-------|------|-------|
| athlete_id | uuid | FK to athletes (1:1) |
| preferred_roles | jsonb | Array: ['flyer','back_spot','front_spot','base','tumbler'] |
| open_to_roles | jsonb | Roles they'd try but didn't request |
| preferred_tier | text | elite / prep / either |
| willing_crossover | boolean | |
| preferred_friends | jsonb | Array of athlete names (advisory only) |
| age_preference | text | same_age / older / no_preference |
| priority | text | flying / day_of_week / friends / level_advancement / no_preference |
| unavailable_dates | jsonb | Array of {date, reason} for competition conflicts |
| notes | text | Any other preferences |

### Table: athlete_skills
| Field | Type | Notes |
|-------|------|-------|
| athlete_id | uuid | FK to athletes |
| skill_id | uuid | FK to skills master list |
| status | text | not_attempted / in_progress / inconsistent / mastered / lost |
| eval_score | int | 1-5 from most recent eval. Null if not evaluated |
| performance_flag | text | null / performance_star / performance_ready / avoid_performance |
| coach_notes | text | Notes on this skill for this athlete |
| private_lesson_notes | text | Notes from private lesson instructors |
| last_updated | timestamptz | |
| updated_by | uuid | FK to users |

### Table: skills (Master List — pre-seeded from USASF reference)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | e.g. "Back Handspring", "Extended Lib", "Toe Touch" |
| category | text | tumbling_standing / tumbling_running / stunt_two_leg / stunt_one_leg / basket_toss / jump / flying / back_spot / front_spot / base |
| level_min | int | Minimum level (1-7) |
| level_max | int | Maximum level (7 for open-ended) |
| tier | text | level_appropriate / advanced / elite |
| usasf_allowed_tiers | jsonb | ['elite','prep','novice'] |
| description | text | Brief description for evaluators |
| prerequisite_skill_ids | jsonb | Array of skill IDs |
| is_thin_division_flag | boolean | True for X.Y split level skills |

### Table: teams
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| gym_id | uuid | FK to gyms |
| name | text | e.g. "Black Diamonds", "Storm" |
| level | text | 1-7 or X.Y format e.g. "1.2" |
| tier | text | elite / prep / novice |
| age_division | text | tiny/mini/youth/junior/senior/open |
| is_coed | boolean | Auto-flagged: male athletes on Elite Level 3+ |
| season_year | int | e.g. 2026 |
| status | text | forming / active / competing / complete |
| head_coach_id | uuid | FK to users |
| assistant_coach_ids | jsonb | Array of user IDs |
| max_athletes | int | Team size cap (default 30) |
| min_athletes | int | USASF compliance minimum |
| practice_requirements | jsonb | {sessions_per_week, duration_minutes, notes} |
| competition_schedule | jsonb | Array of competition_id references |
| routine_duration_seconds | int | Elite=150, Prep=120, Novice=90 |
| is_anchor_team | boolean | True = owner-locked team, AI respects this |
| notes | text | |

### Table: team_athletes (junction)
| Field | Type | Notes |
|-------|------|-------|
| team_id | uuid | FK to teams |
| athlete_id | uuid | FK to athletes |
| is_primary_team | boolean | True = primary, False = crossover |
| crossover_order | int | 1, 2, or 3 (USASF max 3 teams per athlete per comp) |
| routine_roles | jsonb | [{role_type, position, stunt_group, notes}] |
| joined_date | date | |
| status | text | active / injured / suspended / withdrawn |

### Table: eval_sessions
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| gym_id | uuid | FK to gyms |
| season_year | int | |
| round | int | 1 = skills, 2 = stunting |
| status | text | scheduled / active / scoring / complete |
| eval_date | date | |
| notes | text | |
| ai_report_generated | boolean | |
| ai_report | jsonb | Stored AI report output |

### Table: eval_scores
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| eval_session_id | uuid | FK to eval_sessions |
| athlete_id | uuid | FK to athletes |
| skill_id | uuid | FK to skills |
| evaluator_id | uuid | FK to users |
| score | int | 1-5 |
| is_excluded | boolean | Flag to exclude (e.g. bad base situation) |
| exclude_reason | text | e.g. "Inexperienced bases — not representative" |
| weight_override | decimal | 1.0 default. Owner can reduce e.g. 0.5 |
| video_url | text | Link to video for this skill attempt |
| notes | text | Evaluator notes |
| created_at | timestamptz | |

### Table: eval_groups (Round 2 stunting groups)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| eval_session_id | uuid | FK to eval_sessions (round 2 only) |
| group_number | int | Anonymized number shown to athletes/parents |
| time_slot | text | e.g. "5:00 PM" |
| athlete_ids | jsonb | Array of athlete IDs |
| roles_assigned | jsonb | [{athlete_id, role}] |
| notes | text | Evaluator notes on group performance |
| rotation_sequence | int | Which rotation this group is in |

### Table: athlete_anonymous_numbers
| Field | Type | Notes |
|-------|------|-------|
| eval_session_id | uuid | FK to eval_sessions |
| athlete_id | uuid | FK to athletes |
| number | int | Anonymized number shown during eval process |

### Table: competitions
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| gym_id | uuid | FK to gyms |
| name | text | e.g. "UCA Mid-Atlantic Regional" |
| producer | text | e.g. "Varsity", "NCA", "Spirit Sports" |
| location | text | |
| date_start | date | |
| date_end | date | |
| is_major | boolean | True for Nationals/Summit/Worlds |
| sanctioning_body | text | USASF / IASF / The Open / SportCheer UK |
| divisions_entered | jsonb | [{team_id, division_label, teams_in_division, placement}] |
| notes | text | |
| results_logged | boolean | |

### Table: performance_notes
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| competition_id | uuid | FK to competitions |
| team_id | uuid | FK to teams |
| athlete_id | uuid | FK to athletes. Null for team-wide notes |
| author_id | uuid | FK to users |
| note | text | |
| visibility | text | owner_only / coaches_owner / public |
| badge_awarded | jsonb | Optional: {badge_type, label} |

### Table: practice_schedule
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| gym_id | uuid | FK to gyms |
| team_id | uuid | FK to teams |
| facility_name | text | Which facility/mat |
| day_of_week | int | 0=Sunday through 6=Saturday |
| start_time | time | |
| end_time | time | |
| effective_date | date | |
| end_date | date | Null = ongoing |
| notes | text | |

### Table: attendance
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| athlete_id | uuid | FK to athletes |
| team_id | uuid | FK to teams |
| session_date | date | |
| session_type | text | practice / competition / private_lesson |
| status | text | present / absent / excused / late |
| notes | text | |

---

## SECTION 5 — USASF RULES ENGINE

Lives in `src/utils/usasf-rules.js`. Pure JavaScript — no API calls, no database queries. Takes athlete and team data as input, returns flags as output. The AI layer calls this before generating any recommendations.

### Hard Rules — HARD_VIOLATION (block or require resolution)

| Rule | Logic |
|------|-------|
| Prep/Elite Wall | Athlete cannot be on both Elite and Prep teams same season. Exception: temp replacement only. |
| Crossover Maximum | Max 3 cheer teams per athlete per competition. Block 4th assignment. |
| Age Division | DOB vs Aug 31 cutoff. Cannot compete below calculated age group. |
| Level Eligibility | Skills must meet minimum threshold for assigned level. |
| Team Size | Cannot exceed max_athletes for division. |
| Routine Duration | Elite max 2:30, Prep max 2:00, Novice max 1:30 |

### Soft Rules — SOFT_FLAG (warn, owner can override)

| Rule | Logic |
|------|-------|
| Preference Mismatch | Athlete requested prep, placed on elite |
| Friend Preference | None of athlete's preferred friends on team |
| Age Mix | Athlete wanted same-age peers, team skews different |
| Crossover Schedule Conflict | Two of athlete's teams have overlapping practice times |
| Club Size DI/DII | Alert at 110 Elite athletes, flag at 126 |
| Coed Classification | Male athlete on Elite Level 3+ triggers coed prompt |

### Info Flags — INFO_FLAG (informational only)

| Rule | Logic |
|------|-------|
| Thin Division | X.Y level — historically low competition field |
| Development Alert | Athlete at same level 2+ seasons |
| Promotion Ready | Athlete within 1-2 skills of next level |

### X.Y Level Format

Level "X.Y" = Level X building rules + Level Y tumbling rules. Store as string. Split on "." to apply two rule sets. e.g. "2.1" = Level 2 building + Level 1 tumbling.

---

## SECTION 6 — SKILLS MASTER LIST (Pre-seed this data)

### Level 1 — Tumbling Standing
- Forward Roll, Straddle Roll, Backward Roll, Handstand, Cartwheel, Back Limber, Front Limber, Backbend Kickover
- Advanced: Front Walkover, Back Walkover, Handstand Forward Roll, Back Extension Roll, Valdez

### Level 1 — Tumbling Running
- Cartwheel, Round Off
- Advanced: Front Walkover, Front Walkover Series, Round Off + Back Walkover

### Level 1 — Stunts
- Back Stand, Prep Level Show & Go, Flat Back, Extended Flat Back, Shoulder Stand, Straddle Sit
- One-legged: Below Prep Level 1-Leg, Prep Level 1-Leg with Bracer, Chair, Shoulder Sit

### Level 1 — Jumps
- Toe Touch, Hurdler (Right), Hurdler (Left), Pike

### Level 2 — Tumbling Standing
- Back Handspring (BHS), BHS Step Out, Straight Jump + BHS, Back Walkover + BHS
- Advanced: BHS Series, Valdez + BHS

### Level 2 — Tumbling Running
- Cartwheel + BHS, Round Off + BHS, Round Off + BHS Step Out
- Elite: Round Off + BHS Series (3+), Front Handspring, Bounder/Flyspring

### Level 2 — Stunts
- Prep Level 1-Leg (no brace), Extension, Barrel Roll, Leap Frog
- Advanced: Half Twisting Inversion to Extended Stunt
- Basket Tosses: Straight ride only (no skill in air)

### Level 3 — Tumbling
- Standing: BHS Series, Jump + BHS Series
- Running: Round Off + Tuck, Aerial, Punch Front, Round Off + BHS + Tuck

### Level 3 — Stunts
- Extended Lib, Suspended Front Flip, Full Twisting Transition
- Release to Prep or below

### Level 4 — Tumbling
- Standing: Back Tuck, Multiple Back Tucks, Jump + Back Tuck
- Running: Round Off + BHS + Layout, Running Whip to Layout

### Level 4 — Stunts
- Full Twisting Mount to Extended 2-Leg Stunt
- Double Twisting Dismount from 2-Leg Stunt
- Release Move to Extended Single-Leg Stunt

### Level 5 — Tumbling
- Standing: BHS(s) + Full, Standing Full, through Double Full
- Running: Round Off + BHS + Full, through Double Full

### Level 6 — Tumbling
- Standing Double Full, Running Double Full (min 2 BHS before double)
- Stunts: Double-Up to Extended 2-Leg and 1-Leg, 2.25 twist dismount, Rewinds to extended

### Level 7 — Tumbling
- BHS to Double Full allowed (Level 6 requires min 2 BHS)
- Pyramids: 2.5 stories, flyer at prep level holds another flyer

---

## SECTION 7 — MODULE SPECIFICATIONS

### Module 1 — Athlete Profiles
- Athlete/parent login completes own profile: height, weight, still_growing, preferences, unavailable dates
- Coaches/owners see full profile including private notes at their permission level
- Skill history as visual progress tracker per category
- Year-over-year history tab: prior season placements, scores, notes, badges
- Development pathway widget: skills needed to reach next level with coach notes on proximity
- Attendance score auto-calculates from attendance table

### Module 2 — Evaluation Round 1 (Skills)
- Optimized for iPad/tablet landscape orientation
- Skills checklist auto-skips already-mastered skills (status = mastered)
- Each skill scored 1-5 with comment box
- Video attachment per skill — one video taggable to multiple athletes
- Score exclusion with reason, or weight override (e.g. 0.5 for bad base situation)
- Performance flags per skill: performance_star / performance_ready / avoid_performance
- Auto-saves after every score entry
- On session close: AI generates Round 1 Summary Report

### Module 3 — Evaluation Round 2 (Stunting Groups)
- AI generates stunting group assignments from Round 1 results
- Considers: height matching, skill level, role preferences, experience, coach notes
- Each athlete assigned anonymous number for schedule distributed to families
- Internally evaluators see names; athletes/parents see numbers only
- Groups rotate minimum 3 positions; flyers evaluated on strong bases at least once
- Same scoring/exclusion system as Round 1
- Can score group as unit AND individual athletes within group

### Module 4 — AI Team Formation
- Owner locks anchor teams first (e.g. "Black Diamonds" returning team — AI respects this)
- Owner sets parameters: number of teams, any constraints
- AI generates 2-3 team configuration scenarios
- Each scenario: team names, level, tier, age division, athlete roster, projected competitiveness, flagged issues
- Owner selects scenario as starting point
- **Drag-and-drop roster builder:** athletes as cards in team columns
- Hard violations = red alerts. Soft flags = yellow warnings. Info flags = blue notices
- Crossover athletes shown in distinct gold color with crossover count badge (e.g. "2/3 teams")
- Clicking athlete card opens full profile in side drawer without leaving builder
- Owner can trigger AI re-analysis after manual changes

### Module 5 — Coach Assignment
- Coach profiles: skills, certifications, experience levels, availability
- AI suggests coach-to-team matches based on level fit and availability
- Flags scheduling conflicts

### Module 6 — Practice Scheduling
- **This is a constraint satisfaction algorithm, NOT a direct AI prompt**
- Implement as a backtracking constraint solver in `src/utils/scheduler.js`
- Inputs: team requirements (sessions/week, duration), facility availability (by mat/day/time), coach availability, crossover athlete conflicts, blocked dates
- Output: weekly schedule for all teams with zero conflicts
- Multiple facilities and multiple mats supported
- Owner can adjust manually — system flags conflicts introduced

### Module 7 — Season Management
- Routine role assignment: coaches log each athlete's position in routine
- Skill updates: coaches update any athlete's skill status anytime
- Replacement search: select skills/roles needed → ranked list of eligible athletes
- Team notes vs individual notes with visibility toggles
- Private lesson notes field separate from coach notes

### Module 8 — Choreography Report
- Generated before choreography sessions
- Read-only for choreographers on assigned teams
- Includes: team overview, performance_star flagged athletes by skill, recommended stunts, athletes to feature in tumbling, athletes to avoid in performance-critical roles
- After choreo: coaches mark each athlete's actual routine roles

### Module 9 — Competition Management
- Competition calendar: all teams in one view, clickable for details
- Athlete conflict flags from unavailable_dates
- Post-competition: log teams_in_division count, placement, performance notes
- Performance note visibility: owner_only / coaches_owner / public
- Badge awards from performance notes interface
- Division field size logging (crowd-sourced over time)

---

## SECTION 8 — AI LAYER SPECIFICATIONS

> All AI calls use `claude-sonnet-4-20250514`. All prompts pass structured JSON context. All outputs stored in database. AI never takes action directly — always returns recommendations a human approves.

### AI Call 1 — Round 1 Eval Summary Report
- **Trigger:** Owner clicks "Generate AI Report" after Round 1 scoring complete
- **Input:** All eval_scores for session, athlete profiles (level history, coach notes), skill master list
- **Output JSON:**
  - Approximate level groupings for all athletes
  - Athletes flagged close to next level with specific skills needed
  - Suggested Round 2 stunting group assignments with reasoning
  - Athletes who should be evaluated in new roles based on preferences/potential

### AI Call 2 — Round 2 Stunting Group Generator
- **Trigger:** Owner clicks "Generate Round 2 Groups"
- **Input:** Round 1 summary, athlete heights, role preferences, experience flags, coach notes
- **Output:** Structured group assignments with time slots, role assignments per athlete, rotation sequence. Ensures flyers get at least one rotation with strong experienced bases.

### AI Call 3 — Team Formation Scenarios
- **Trigger:** Owner clicks "Generate Team Scenarios" after setting anchor teams and parameters
- **Input:** Full athlete pool with eval scores/skills, USASF rules engine output, anchor team constraints, owner parameters, thin division flags
- **Output:** 2-3 complete team scenarios. Each includes team-by-team rosters, projected level/tier/age division, flagged violations and warnings, brief rationale.

### AI Call 4 — Replacement Search
- **Trigger:** Owner/coach uses replacement search after selecting required skills and roles
- **Input:** Required skills (from departed athlete's routine roles), required role type, team practice schedule, all active gym athletes with skills and team assignments
- **Output:** Ranked replacement candidates with skill match score, crossover eligibility, schedule compatibility, preparation notes.

### AI Call 5 — Development Pathway Flags
- **Trigger:** Background job at season start and after each eval session
- **Input:** Each athlete's full skill and level history across all seasons
- **Output:** Flags for (a) same level 2+ seasons, (b) within 1-2 skills of next level, (c) skill regression. Writes to athlete profile.

---

## SECTION 9 — UI/UX REQUIREMENTS

### Flag Visual System
- **HARD_VIOLATION:** Red banner with X icon. Blocks saving until resolved.
- **SOFT_FLAG:** Yellow/amber banner with warning triangle. Owner can dismiss with confirmation.
- **INFO_FLAG:** Blue banner with info icon. Informational only.

### Drag-and-Drop Roster Builder
- Use `@dnd-kit/core`
- Athletes as cards: name, photo thumbnail, level, tier, age division, key flags
- Teams as columns
- Dragging triggers real-time rules engine check with immediate flag display
- Crossover athletes: gold border + crossover count badge
- Click athlete card → full profile in side drawer (no navigation away from builder)

### Evaluation Interface
- iPad/tablet landscape optimized
- Minimum 44px tap targets
- Score buttons 1-5: large circular buttons with clear selected state
- Camera icon per skill for video attachment
- Auto-saves every score entry

### Navigation Structure
| Route | Page |
|-------|------|
| /dashboard | Gym overview: upcoming evals, active teams, open flags, season timeline |
| /athletes | Full roster with filters. Click into athlete profiles |
| /evaluations | Eval session management, Round 1 and Round 2 interfaces |
| /teams | Team list, click into team detail with roster/schedule/routine roles |
| /placement | Team formation workspace — drag-and-drop builder |
| /schedule | Practice schedule calendar across all teams and facilities |
| /competitions | Competition calendar and post-competition logging |
| /reports | Choreography reports, AI summaries, development pathway reports |
| /settings | Gym settings, user management, season configuration |

---

## SECTION 10 — BUILD SEQUENCE

> Build in this order. Each phase must be working and deployed before moving to the next. Ask Holly to confirm before moving from one phase to the next.

### PHASE 1 — Core Foundation (Demo-Ready MVP)
1. Supabase schema: all tables from Section 4, RLS policies, seed skills master list
2. Auth: Supabase Auth with all 5 role types
3. Gym setup: onboarding wizard (name, facilities, season dates)
4. Athlete profiles: full creation, parent/athlete self-entry for preferences and availability
5. Evaluation Round 1: evaluator interface, scoring, video attachment, score exclusion/weighting
6. AI Round 1 Summary Report
7. Evaluation Round 2: AI group generator, anonymous numbers, group scoring
8. Team Formation: AI scenario generator, drag-and-drop builder, full flag system
9. Deploy to Netlify

### PHASE 2 — Season Operations
10. Coach assignment module
11. Practice scheduling engine (constraint solver)
12. Routine role assignment interface
13. Replacement search tool
14. Skill update interface for coaches
15. Development pathway flags background job

### PHASE 3 — Season Close & Communication
16. Competition management module
17. Performance notes with visibility toggles
18. Badge system
19. Choreography report generator
20. Email notifications via Resend

### PHASE 4 — Growth Features
21. Division field size logging and aggregation
22. Mobile optimization pass
23. Billing integration (Stripe)

---

## SECTION 11 — KEY DECISIONS (Do Not Re-Litigate These)

- Stack is React + Supabase + Netlify + Anthropic API. Do not suggest alternatives.
- All AI calls use `claude-sonnet-4-20250514`. No other model.
- USASF rules engine is pure JS utility — no AI calls, no DB queries.
- Scheduling engine is a constraint solver — not a direct AI prompt.
- Auth is Supabase Auth with RLS. No custom auth.
- Email is Resend. No other provider.
- No em dashes anywhere in UI copy.
- The product is called CheerCast. Tagline: "Evaluate. Build. Win."

---

## READY TO START

When you have read this document in full, respond with:
1. A one-paragraph summary of what CheerCast is and does (in your own words — this confirms comprehension)
2. Any clarifying questions before we start
3. Confirmation that you are ready to begin Phase 1 Step 1

**Wait for Holly to say "go" before writing any code.**

---

*CheerCast | Gleeson Consulting | holly@gleeson-consulting.com | 610-574-3978*

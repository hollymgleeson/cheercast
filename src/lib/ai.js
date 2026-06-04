// All AI calls go through this file.
// Uses claude-sonnet-4-20250514 for all calls.
// AI never takes action — always returns recommendations a human approves.

// All AI calls go directly to Anthropic API
// VITE_ANTHROPIC_API_KEY is set in .env.local (dev) and Netlify env vars (prod)

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
const MODEL = 'claude-sonnet-4-6'

async function callClaude(systemPrompt, userMessage) {
  if (!API_KEY) {
    throw new Error('Anthropic API key not configured. Please check environment variables.')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'AI request failed')
  }

  const data = await response.json()
  let text = data.content[0].text
  // Strip markdown code fences if present
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  try { return JSON.parse(text) } catch { return { raw: text } }
}

// ─── AI Call 1: Round 1 Eval Summary Report ──────────────────────────────────

export async function generateEvalRound1Report({ scores, athletes, skills, sessionId }) {
  const system = `You are CheerCast's AI evaluation analyst for competitive All Star cheer.
You receive structured evaluation data and return structured JSON recommendations.
You must respond with ONLY valid JSON — no markdown, no explanation outside the JSON.`

  const user = `Analyze these Round 1 evaluation scores and generate a summary report.

EVAL SESSION ID: ${sessionId}

ATHLETES:
${JSON.stringify(athletes, null, 2)}

SKILLS MASTER LIST:
${JSON.stringify(skills, null, 2)}

SCORES:
${JSON.stringify(scores, null, 2)}

Return JSON in this exact format:
{
  "level_groupings": [
    { "athlete_id": "", "athlete_name": "", "suggested_level": "", "suggested_tier": "", "reasoning": "" }
  ],
  "close_to_next_level": [
    { "athlete_id": "", "athlete_name": "", "current_level": "", "next_level": "", "skills_needed": [], "notes": "" }
  ],
  "round2_group_suggestions": [
    { "group_label": "", "athlete_ids": [], "suggested_roles": {}, "reasoning": "" }
  ],
  "role_change_candidates": [
    { "athlete_id": "", "athlete_name": "", "current_role": "", "suggested_role": "", "reasoning": "" }
  ],
  "summary_notes": ""
}`

  return callClaude(system, user)
}

// ─── AI Call 2: Round 2 Stunting Group Generator ─────────────────────────────

export async function generateRound2Groups({ round1Report, athletes }) {
  const system = `You are CheerCast's AI evaluation analyst for competitive All Star cheer.
You create fair, skill-matched stunting evaluation groups.
You must respond with ONLY valid JSON.`

  const user = `Generate Round 2 stunting group assignments.

ROUND 1 REPORT:
${JSON.stringify(round1Report, null, 2)}

ATHLETES (with heights, role preferences, experience):
${JSON.stringify(athletes, null, 2)}

Rules:
- Each group needs 1 flyer, 2 bases, 1 back spot (minimum)
- Match heights for stability
- Every flyer must be evaluated on strong experienced bases at least once
- Minimum 3 rotation positions per group
- Athletes get anonymous numbers for schedule distributed to families

Return JSON in this exact format:
{
  "groups": [
    {
      "group_number": 1,
      "time_slot": "5:00 PM",
      "rotation_sequence": 1,
      "athlete_assignments": [
        { "athlete_id": "", "role": "flyer|base|back_spot|front_spot", "anonymous_number": 1 }
      ],
      "reasoning": ""
    }
  ],
  "schedule_notes": ""
}`

  return callClaude(system, user)
}

// ─── AI Call 3: Team Formation Scenarios ─────────────────────────────────────

export async function generateTeamScenarios({ athletes, anchorTeams, parameters, ruleFlags }) {
  const system = `You are CheerCast's AI team formation engine for competitive All Star cheer.
You generate 2-3 complete team configuration scenarios respecting USASF rules.
You must respond with ONLY valid JSON.`

  const requestedTeamsNote = parameters.requested_teams?.length
    ? `\nOWNER REQUESTED TEAMS (build scenarios around these):\n${JSON.stringify(parameters.requested_teams, null, 2)}`
    : ''
  const additionalNotes = parameters.additional_notes
    ? `\nADDITIONAL OWNER INSTRUCTIONS: ${parameters.additional_notes}`
    : ''

  const user = `Generate team formation scenarios for this gym's athlete pool.

ATHLETE POOL (with eval scores, skills, preferences):
${JSON.stringify(athletes, null, 2)}

ANCHOR TEAMS (locked — do not modify these):
${JSON.stringify(anchorTeams, null, 2)}

OWNER PARAMETERS:
${JSON.stringify(parameters, null, 2)}
${requestedTeamsNote}
${additionalNotes}

USASF RULE FLAGS:
${JSON.stringify(ruleFlags, null, 2)}

Return JSON in this exact format:
{
  "scenarios": [
    {
      "scenario_id": "A",
      "scenario_label": "Balanced Growth",
      "rationale": "",
      "teams": [
        {
          "team_name": "",
          "level": "",
          "tier": "elite|prep|novice",
          "age_division": "",
          "athlete_ids": [],
          "projected_competitiveness": "high|medium|low",
          "hard_violations": [],
          "soft_flags": [],
          "info_flags": [],
          "notes": ""
        }
      ]
    }
  ]
}`

  return callClaude(system, user)
}

// ─── AI Call 4: Replacement Search ───────────────────────────────────────────

export async function generateReplacementCandidates({ requiredSkills, requiredRole, teamSchedule, allAthletes }) {
  const system = `You are CheerCast's AI roster analyst for competitive All Star cheer.
You identify the best replacement candidates for an open team spot.
You must respond with ONLY valid JSON.`

  const user = `Find replacement candidates for this open roster spot.

REQUIRED SKILLS: ${JSON.stringify(requiredSkills)}
REQUIRED ROLE: ${requiredRole}
TEAM PRACTICE SCHEDULE: ${JSON.stringify(teamSchedule)}

ALL ACTIVE ATHLETES (with skills, team assignments, schedule):
${JSON.stringify(allAthletes, null, 2)}

Return JSON in this exact format:
{
  "candidates": [
    {
      "athlete_id": "",
      "athlete_name": "",
      "skill_match_score": 0,
      "crossover_eligible": true,
      "schedule_compatible": true,
      "preparation_notes": "",
      "rank": 1
    }
  ],
  "search_notes": ""
}`

  return callClaude(system, user)
}

// ─── AI Call 5: Development Pathway Flags ────────────────────────────────────

export async function generateDevelopmentFlags({ athlete, skillHistory }) {
  const system = `You are CheerCast's AI athlete development analyst for competitive All Star cheer.
You identify development flags for individual athletes.
You must respond with ONLY valid JSON.`

  const user = `Analyze this athlete's development across seasons.

ATHLETE: ${JSON.stringify(athlete)}
SKILL HISTORY (all seasons): ${JSON.stringify(skillHistory)}

Return JSON in this exact format:
{
  "flags": [
    {
      "type": "same_level_alert|promotion_ready|skill_regression",
      "label": "",
      "details": "",
      "skills_needed": []
    }
  ]
}`

  return callClaude(system, user)
}

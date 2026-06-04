// USASF Rules Engine
// Pure JavaScript — no API calls, no database queries.
// Takes athlete and team data as input, returns flags as output.

export const FLAG_TYPES = {
  HARD_VIOLATION: 'HARD_VIOLATION',
  SOFT_FLAG: 'SOFT_FLAG',
  INFO_FLAG: 'INFO_FLAG',
}

// Age division cutoff is August 31 of the competition year
export function calculateAgeOnCutoff(dateOfBirth, seasonYear) {
  const cutoff = new Date(`${seasonYear}-08-31`)
  const dob = new Date(dateOfBirth)
  let age = cutoff.getFullYear() - dob.getFullYear()
  const m = cutoff.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && cutoff.getDate() < dob.getDate())) age--
  return age
}

// Get age division using USASF standard OR custom gym config
// customConfig = gym.settings?.age_division_config
export function getAgeDivision(dateOfBirth, seasonYear, customConfig = null) {
  if (!dateOfBirth) return null

  if (customConfig?.use_custom && customConfig?.divisions?.length) {
    const birthYear = new Date(dateOfBirth).getFullYear()
    const mode = customConfig.mode || 'birth_year'

    if (mode === 'birth_year') {
      // Sort divisions by cutoff_birth_year descending (oldest division first)
      const sorted = [...customConfig.divisions]
        .filter(d => d.cutoff_birth_year)
        .sort((a, b) => a.cutoff_birth_year - b.cutoff_birth_year)

      // Find the division: athlete must be born in cutoff_birth_year or later
      // The youngest division with cutoff_birth_year >= athlete's birth year
      for (const div of sorted) {
        if (birthYear >= div.cutoff_birth_year) {
          return div.name || div.label?.toLowerCase().replace(/\s*\(.*\)/, '').trim()
        }
      }
      // If birth year is older than all cutoffs, return the oldest division
      return sorted[0]?.name || 'senior'
    } else {
      // Age cutoff mode
      const age = calculateAgeOnCutoff(dateOfBirth, seasonYear)
      const sorted = [...customConfig.divisions]
        .filter(d => d.max_age)
        .sort((a, b) => a.max_age - b.max_age)
      for (const div of sorted) {
        if (age <= div.max_age) return div.name || div.label?.toLowerCase()
      }
      return sorted[sorted.length - 1]?.name || 'open'
    }
  }

  // USASF standard
  const age = calculateAgeOnCutoff(dateOfBirth, seasonYear)
  if (age <= 5) return 'tiny'
  if (age <= 8) return 'mini'
  if (age <= 11) return 'youth'
  if (age <= 14) return 'junior'
  if (age <= 18) return 'senior'
  return 'open'
}

// Parse X.Y level format
export function parseLevel(levelStr) {
  if (!levelStr) return { building: null, tumbling: null, isXY: false }
  const str = String(levelStr)
  if (str.includes('.')) {
    const [x, y] = str.split('.')
    return { building: parseInt(x), tumbling: parseInt(y), isXY: true }
  }
  const n = parseInt(str)
  return { building: n, tumbling: n, isXY: false }
}

// ─── Hard Rules ───────────────────────────────────────────────────────────────

export function checkPrepEliteWall(athlete, allTeamAssignments) {
  // Athlete cannot be on both Elite and Prep teams same season
  const tiers = allTeamAssignments
    .filter(a => a.athlete_id === athlete.id)
    .map(a => a.team?.tier)
    .filter(Boolean)

  const hasElite = tiers.includes('elite')
  const hasPrep = tiers.includes('prep')

  if (hasElite && hasPrep) {
    return {
      type: FLAG_TYPES.HARD_VIOLATION,
      rule: 'PREP_ELITE_WALL',
      message: `${athlete.first_name} ${athlete.last_name} cannot be on both Elite and Prep teams in the same season.`,
      athlete_id: athlete.id,
    }
  }
  return null
}

export function checkCrossoverMaximum(athlete, assignments) {
  const athleteAssignments = assignments.filter(a => a.athlete_id === athlete.id)
  if (athleteAssignments.length > 3) {
    return {
      type: FLAG_TYPES.HARD_VIOLATION,
      rule: 'CROSSOVER_MAXIMUM',
      message: `${athlete.first_name} ${athlete.last_name} is assigned to ${athleteAssignments.length} teams. USASF maximum is 3 per competition.`,
      athlete_id: athlete.id,
    }
  }
  return null
}

export function checkAgeDivision(athlete, team, seasonYear, customConfig = null) {
  const athleteDiv = getAgeDivision(athlete.date_of_birth, seasonYear, customConfig)
  const divOrder = ['tiny', 'mini', 'youth', 'junior', 'senior', 'open']
  const athleteIndex = divOrder.indexOf(athleteDiv)
  const teamIndex = divOrder.indexOf(team.age_division)

  if (athleteIndex > teamIndex) {
    return {
      type: FLAG_TYPES.HARD_VIOLATION,
      rule: 'AGE_DIVISION',
      message: `${athlete.first_name} ${athlete.last_name} (${athleteDiv}) cannot compete in a younger age division (${team.age_division}).`,
      athlete_id: athlete.id,
    }
  }
  return null
}

export function checkTeamSize(team, athleteCount) {
  if (team.max_athletes && athleteCount > team.max_athletes) {
    return {
      type: FLAG_TYPES.HARD_VIOLATION,
      rule: 'TEAM_SIZE',
      message: `${team.name} has ${athleteCount} athletes. Maximum for this division is ${team.max_athletes}.`,
      team_id: team.id,
    }
  }
  return null
}

export function checkCoedClassification(athlete, team) {
  // Male athlete on Elite Level 3+ triggers coed flag
  if (athlete.gender === 'male' && team.tier === 'elite') {
    const { building } = parseLevel(team.level)
    if (building >= 3 && !team.is_coed) {
      return {
        type: FLAG_TYPES.HARD_VIOLATION,
        rule: 'COED_CLASSIFICATION',
        message: `${athlete.first_name} ${athlete.last_name} is male. ${team.name} (Elite Level ${team.level}) must be classified as coed.`,
        athlete_id: athlete.id,
        team_id: team.id,
      }
    }
  }
  return null
}

// ─── Soft Rules ───────────────────────────────────────────────────────────────

export function checkPreferenceMismatch(athlete, team) {
  const prefs = athlete.athlete_preferences
  if (!prefs) return null

  if (prefs.preferred_tier && prefs.preferred_tier !== 'either' && prefs.preferred_tier !== team.tier) {
    return {
      type: FLAG_TYPES.SOFT_FLAG,
      rule: 'PREFERENCE_MISMATCH',
      message: `${athlete.first_name} ${athlete.last_name} requested ${prefs.preferred_tier} but is placed on ${team.tier} team "${team.name}".`,
      athlete_id: athlete.id,
    }
  }
  return null
}

export function checkCrossoverScheduleConflict(athlete, teams) {
  // Simplified: flag if athlete is on 2+ teams with same day_of_week in schedule
  // Full implementation requires practice_schedule data
  return null
}

export function checkClubSizeDIDII(eliteAthleteCount) {
  if (eliteAthleteCount >= 126) {
    return {
      type: FLAG_TYPES.SOFT_FLAG,
      rule: 'CLUB_SIZE_DI_DII',
      message: `This gym has ${eliteAthleteCount} elite athletes, which meets the DI threshold (126+). Verify division classification.`,
    }
  }
  if (eliteAthleteCount >= 110) {
    return {
      type: FLAG_TYPES.SOFT_FLAG,
      rule: 'CLUB_SIZE_APPROACHING',
      message: `This gym has ${eliteAthleteCount} elite athletes and is approaching the DI threshold of 126.`,
    }
  }
  return null
}

// ─── Info Flags ───────────────────────────────────────────────────────────────

export function checkThinDivision(team) {
  const { isXY } = parseLevel(team.level)
  if (isXY) {
    return {
      type: FLAG_TYPES.INFO_FLAG,
      rule: 'THIN_DIVISION',
      message: `${team.name} is a ${team.level} (X.Y) split level team. These divisions historically have fewer competing teams.`,
      team_id: team.id,
    }
  }
  return null
}

export function checkDevelopmentAlert(athlete) {
  // Flag if athlete has been at the same level for 2+ seasons
  // Requires year-over-year history — simplified here
  return null
}

export function checkPromotionReady(athlete, skills) {
  // Flag if athlete is within 1-2 skills of next level
  // Full implementation requires skills master list comparison
  return null
}

// ─── Main Runner ──────────────────────────────────────────────────────────────

export function runAllChecks({ athlete, team, allAssignments, seasonYear, eliteCount }) {
  const flags = []

  if (athlete && allAssignments) {
    const crossover = checkCrossoverMaximum(athlete, allAssignments)
    if (crossover) flags.push(crossover)

    const prepElite = checkPrepEliteWall(athlete, allAssignments)
    if (prepElite) flags.push(prepElite)
  }

  if (athlete && team) {
    if (athlete.date_of_birth && seasonYear) {
      const ageFl = checkAgeDivision(athlete, team, seasonYear)
      if (ageFl) flags.push(ageFl)
    }

    const coed = checkCoedClassification(athlete, team)
    if (coed) flags.push(coed)

    const pref = checkPreferenceMismatch(athlete, team)
    if (pref) flags.push(pref)
  }

  if (team) {
    const thin = checkThinDivision(team)
    if (thin) flags.push(thin)
  }

  if (eliteCount !== undefined) {
    const clubSize = checkClubSizeDIDII(eliteCount)
    if (clubSize) flags.push(clubSize)
  }

  return flags
}

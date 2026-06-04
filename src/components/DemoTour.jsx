import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const TOUR_STORAGE_KEY = 'cheercast_tour_complete'

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to CheerCast',
    description: 'CheerCast is your gym\'s AI-powered roster intelligence system. This quick tour will walk you through the key features. It takes about 3 minutes.',
    route: '/dashboard',
    emoji: '🎉',
    wide: true,
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'This is your home base. See upcoming competitions, active eval sessions, and quick links to everything you need. The dashboard updates in real time as your season progresses.',
    route: '/dashboard',
    emoji: '⬡',
    highlight: 'You\'re looking at it right now!',
  },
  {
    id: 'athletes',
    title: 'Your Athlete Roster',
    description: 'Every athlete in your gym lives here. You can add athletes one at a time, or import your entire roster from a spreadsheet or your existing registration system using the Import CSV button.',
    route: '/athletes',
    emoji: '◎',
    action: 'Click "Athletes" in the sidebar to follow along',
  },
  {
    id: 'athlete_profile',
    title: 'Athlete Profiles',
    description: 'Click any athlete to open their full profile. You\'ll find their contact info, skills history, coach notes (with visibility controls so parents only see what you want), and role preferences.',
    route: '/athletes',
    emoji: '👤',
    highlight: 'Try clicking any athlete name to explore their profile',
  },
  {
    id: 'athlete_skills',
    title: 'Skills Tracking',
    description: 'On an athlete\'s profile, the Skills tab shows every skill organized by category and level. Coaches can mark skills as In Progress, Inconsistent, Mastered, or Lost at any time — not just during evals.',
    route: '/athletes',
    emoji: '✦',
    highlight: 'Open an athlete → Skills tab',
  },
  {
    id: 'evaluations',
    title: 'Evaluation Sessions',
    description: 'Create an eval session for any date. Coaches open the session on their phone or iPad and score each athlete on each skill using the 1-5 scale. Everything auto-saves — no data is ever lost.',
    route: '/evaluations',
    emoji: '📋',
    action: 'Click "Evaluations" in the sidebar',
  },
  {
    id: 'eval_scoring',
    title: 'The Scoring Interface',
    description: 'The scoring interface is designed for phone and iPad. Select an athlete from the list, then tap the colored score buttons for each skill. Flag performance stars, mark exclusions, and attach photos or video.',
    route: '/evaluations',
    emoji: '📱',
    highlight: 'Open any eval session to see the scoring interface',
  },
  {
    id: 'ai_report',
    title: 'AI Eval Report',
    description: 'Once scoring is complete, CheerCast\'s AI analyzes all the scores and generates a report with suggested level groupings, athletes close to promotion, and recommended Round 2 stunting groups.',
    route: '/evaluations',
    emoji: '🤖',
    highlight: 'The "Generate AI Report" button appears at the bottom of the athlete list',
  },
  {
    id: 'teams',
    title: 'Your Teams',
    description: 'See all your teams in one place. Click any team to set role requirements — like "4 stunt groups of 4" or specific flyer/base/back spot counts. The placement builder uses these requirements to track coverage.',
    route: '/teams',
    emoji: '◈',
    action: 'Click "Teams" in the sidebar',
  },
  {
    id: 'placement',
    title: 'The Placement Builder',
    description: 'This is where CheerCast really shines. Drag and drop athletes between teams. USASF rules check instantly — violations show in red, warnings in yellow. Role coverage updates live as you build rosters.',
    route: '/placement',
    emoji: '⊞',
    action: 'Click "Placement" in the sidebar — try dragging an athlete!',
  },
  {
    id: 'ai_placement',
    title: 'AI Team Scenarios',
    description: 'Not sure where to start? Click "Generate AI Scenarios" and CheerCast\'s AI will analyze your full athlete pool and suggest 2-3 complete team configurations. You pick the best starting point, then fine-tune manually.',
    route: '/placement',
    emoji: '✦',
    highlight: 'The gold "Generate AI Scenarios" button is in the top right',
  },
  {
    id: 'skills_config',
    title: 'Customize Your Skills List',
    description: 'In Settings → Skills Configuration, you can turn off skills your gym doesn\'t evaluate and add custom notes to any skill. Disabled skills disappear everywhere in the app — keeping evaluations focused.',
    route: '/settings',
    emoji: '⚙',
    action: 'Click "Settings" in the sidebar → Skills Configuration tab',
  },
  {
    id: 'finish',
    title: 'You\'re ready to go!',
    description: 'That\'s the core of CheerCast. Start by importing your athletes, setting up your teams, and creating your first eval session. Your CheerCast team is here to help if you need anything.',
    route: '/dashboard',
    emoji: '🏆',
    wide: true,
    final: true,
  },
]

export default function DemoTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Show tour if not completed
    const done = localStorage.getItem(TOUR_STORAGE_KEY)
    if (!done) {
      setTimeout(() => setVisible(true), 800)
    }
  }, [])

  function handleNext() {
    const next = step + 1
    if (next >= STEPS.length) {
      completeTour()
      return
    }
    setStep(next)
    const nextStep = STEPS[next]
    if (nextStep.route && nextStep.route !== location.pathname) {
      navigate(nextStep.route)
    }
  }

  function handleBack() {
    const prev = step - 1
    if (prev < 0) return
    setStep(prev)
    const prevStep = STEPS[prev]
    if (prevStep.route && prevStep.route !== location.pathname) {
      navigate(prevStep.route)
    }
  }

  function completeTour() {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    setVisible(false)
  }

  function restartTour() {
    localStorage.removeItem(TOUR_STORAGE_KEY)
    setStep(0)
    setVisible(true)
    setMinimized(false)
    navigate('/dashboard')
  }

  const current = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

  if (!visible) {
    return (
      <button
        onClick={restartTour}
        className="fixed bottom-4 right-4 z-50 bg-[#8b002e] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg hover:bg-[#a30035] transition-colors flex items-center gap-2"
      >
        ✦ Take the Tour
      </button>
    )
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 bg-[#8b002e] text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg hover:bg-[#a30035] transition-colors flex items-center gap-2"
      >
        ✦ Continue Tour ({step + 1}/{STEPS.length})
      </button>
    )
  }

  return (
    <>
      {/* Subtle backdrop */}
      <div className="fixed inset-0 z-40 pointer-events-none bg-black/10" />

      {/* Tour card */}
      <div className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col ${current.wide ? 'w-96' : 'w-80'}`}>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-[#8b002e] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{current.emoji}</span>
            <span className="text-xs font-semibold text-gray-400">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors text-sm"
              title="Minimize"
            >
              −
            </button>
            <button
              onClick={completeTour}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors text-sm"
              title="Skip tour"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-4">
          <h3 className="font-bold text-[#1B2E4B] text-base mb-2">{current.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{current.description}</p>

          {current.action && (
            <div className="mt-3 flex items-start gap-2 bg-[#8b002e]/5 rounded-lg px-3 py-2">
              <span className="text-[#8b002e] text-sm mt-0.5">→</span>
              <span className="text-xs text-[#8b002e] font-medium">{current.action}</span>
            </div>
          )}

          {current.highlight && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2">
              <span className="text-amber-500 text-sm mt-0.5">💡</span>
              <span className="text-xs text-amber-700">{current.highlight}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-colors font-medium"
          >
            ← Back
          </button>

          <button
            onClick={handleNext}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              current.final
                ? 'bg-[#1B2E4B] text-white hover:bg-[#243d63]'
                : 'bg-[#8b002e] text-white hover:bg-[#a30035]'
            }`}
          >
            {current.final ? '🏆 Let\'s go!' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  )
}

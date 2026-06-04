---
name: project-context
description: "Core project context for CheerCast — stack, Supabase URL, design partner gym, build sequence"
metadata: 
  node_type: memory
  type: project
  originSessionId: 71cf105f-2164-4fd9-b952-badaaa03993e
---

CheerCast is an AI-powered athlete roster intelligence system for competitive All Star cheer gyms. Built for Gleeson Consulting (holly@gleeson-consulting.com).

**Supabase project URL:** https://vxyxvjyjpgkweefcnlvp.supabase.co
**Project ID:** vxyxvjyjpgkweefcnlvp

**Stack:** React + Vite + Tailwind CSS + React Router + Supabase + Anthropic API (claude-sonnet-4-20250514) + Resend email + Netlify

**Design partner gym:** Kedron Cheerleading — ~80 athletes, 1 facility. Holly will load real data once app is ready.

**Working directory:** /Users/hollyschrock/Dropbox/CheerCast

**Build sequence:** Phase 1 first, confirm with Holly before each phase. See BRIEF.md Section 10.

**Current status:** Phase 1 nearly complete. Demo deployed at cheercast.netlify.app.
**Demo gym:** All Star Athletics (demo@allstarathletics.com) -- 40 athletes, 4 teams, fully seeded.
**Kedron gym:** Created in DB but no athletes imported yet. Nicole's evals start Monday June 2.

**What's built:**
- Full auth, RLS, all 14 DB tables
- Athlete profiles, import CSV, skills tracking, role ranking
- Eval Round 1 scoring interface (phone/iPad ready), photo/video upload to Supabase storage
- Team builder with requirements (simple totals or stunt groups)
- Placement builder with drag-and-drop, USASF rules engine, AI scenarios
- AI features working (model: claude-sonnet-4-6, VITE_ANTHROPIC_API_KEY in .env.local)
- Skills configuration in Settings
- Coach invite system (Settings → Team Members → invite link → /join/:token)
- Demo tour component (auto-pops first login, localStorage key: cheercast_tour_complete)
- Logo files in public/: CheerCast stacked with tag line).png, CheerCast script horizontal.png, CheerCast circle.png, CheerCast.gif
- Brand colors: red #8b002e (primary), navy #1B2E4B (accent/sidebar), white sidebar

**Still to build:**
- Real-time eval scoring (Supabase realtime subscriptions)
- Competition management (basic CompetitionsPage exists, needs add/edit forms)
- Fix API key security (move to netlify/functions/ai.js serverless only)
- Netlify continuous deployment via GitHub (currently manual drag-and-drop)

**How to apply:** Always check current phase before suggesting features. Don't build ahead.

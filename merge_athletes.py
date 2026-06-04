import csv
import re
from datetime import datetime

def clean(s):
    return s.strip() if s else ''

def clean_phone(s):
    if not s: return ''
    digits = re.sub(r'\D', '', s)
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return s.strip()

def parse_dob(s):
    s = clean(s)
    if not s: return ''
    # Handle bad year like 0017
    for fmt in ['%m/%d/%Y', '%m/%d/%y']:
        try:
            d = datetime.strptime(s, fmt)
            if d.year < 1990: return ''
            return d.strftime('%Y-%m-%d')
        except:
            pass
    return ''

def split_name(full):
    parts = clean(full).split()
    if len(parts) >= 2:
        return parts[0], ' '.join(parts[1:])
    return clean(full), ''

def normalize_email(e):
    return clean(e).lower()

# ── Load registration file (has DOB, phone, full details) ──────────────────
reg_athletes = {}  # keyed by normalized full name

with open('2026 - 2027 Registration Link (Responses) - Form Responses 1.csv', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        first = clean(row["Athlete's First Name"])
        last  = clean(row["Athlete's Last Name"])
        if not first or not last: continue

        dob_raw = clean(row["Athlete's date of birth"])
        dob = parse_dob(dob_raw)

        # Pick best parent info (mother first, fall back to father)
        parent_first = clean(row["Mother/Guardian First Name"]) or clean(row["Father/Guardian First Name"])
        parent_last  = clean(row["Mother/Guardian Last Name"])  or clean(row["Father/Guardian Last Name"])
        parent_name  = f"{parent_first} {parent_last}".strip()
        parent_email = normalize_email(row["Mother/Guardian's Email Address"]) or normalize_email(row["Father/Guardian's Email Address"])
        parent_phone = clean_phone(row["Mother/Guardian's Cell Number"]) or clean_phone(row["Father/Guardian's Cell Number"])

        key = f"{first.lower()} {last.lower()}"
        reg_athletes[key] = {
            'first_name':   first,
            'last_name':    last,
            'date_of_birth': dob,
            'parent_name':  parent_name,
            'parent_email': parent_email,
            'parent_phone': parent_phone,
        }

# ── Load eval file (may have athletes not in registration) ─────────────────
eval_athletes = {}

with open('26-27 KC Evaluations (Responses) - Form Responses 1.csv', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        full = clean(row['Cheerleader Name'])
        if not full: continue
        first, last = split_name(full)
        if not first: continue

        birth_year = clean(row.get('Birth Year', ''))
        dob = f"{birth_year}-01-01" if birth_year and len(birth_year) == 4 else ''

        parent_name  = clean(row['Parent Name'])
        parent_email = normalize_email(row['Parent Email'])

        key = f"{first.lower()} {last.lower()}"
        eval_athletes[key] = {
            'first_name':   first,
            'last_name':    last,
            'date_of_birth': dob,
            'parent_name':  parent_name,
            'parent_email': parent_email,
            'parent_phone': '',
        }

# ── Merge: registration wins on conflicts, eval fills gaps ─────────────────
merged = {}

# Start with registration (best data)
for key, a in reg_athletes.items():
    merged[key] = a.copy()

# Add eval athletes not in registration, or fill in DOB from eval if missing
for key, a in eval_athletes.items():
    if key not in merged:
        merged[key] = a.copy()
    else:
        # Fill in DOB if registration only had birth year
        if not merged[key]['date_of_birth'] and a['date_of_birth']:
            merged[key]['date_of_birth'] = a['date_of_birth']

# ── Deduplicate by parent email + similar first name ──────────────────────
# (catches Summer Simmons appearing twice with same email)
seen = {}
final = {}
for key, a in merged.items():
    dedup_key = f"{a['first_name'].lower()}|{a['parent_email']}"
    if dedup_key not in seen:
        seen[dedup_key] = key
        final[key] = a

# ── Manual corrections ────────────────────────────────────────────────────
fixes = {
    'amelia ':       {'last_name': 'Flagiello'},
    'liliana ':      {'last_name': 'Flagiello'},
    'bobbie-jo ':    {'last_name': 'Gouck'},
}
for key, updates in fixes.items():
    if key in final:
        final[key].update(updates)

# Merge Gabby/Gabriella Fusaro — keep Gabriella (has full DOB)
if 'gabby fusaro' in final and 'gabriella fusaro' in final:
    del final['gabby fusaro']

# Remove Madison Dutch (bad DOB, no fix available)
final.pop('madison dutch', None)

# Fix Isabella Spadaro email typo
if 'isabella spadaro' in final:
    final['isabella spadaro']['parent_email'] = 'marinewifey325@aol.com'

# ── Write output CSV ───────────────────────────────────────────────────────
fields = ['first_name', 'last_name', 'date_of_birth', 'parent_name', 'parent_email', 'parent_phone', 'status']

with open('kedron_athletes_import.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    for a in sorted(final.values(), key=lambda x: (x['last_name'].lower(), x['first_name'].lower())):
        w.writerow({
            'first_name':    a['first_name'],
            'last_name':     a['last_name'],
            'date_of_birth': a['date_of_birth'],
            'parent_name':   a['parent_name'],
            'parent_email':  a['parent_email'],
            'parent_phone':  a['parent_phone'],
            'status':        'active',
        })

print(f"Done. {len(final)} athletes written to kedron_athletes_import.csv")

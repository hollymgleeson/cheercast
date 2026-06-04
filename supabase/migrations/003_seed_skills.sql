-- CheerCast Skills Master List Seed Data
-- Based on BRIEF Section 6

insert into skills (name, category, level_min, level_max, tier, description) values

-- ─── LEVEL 1 TUMBLING STANDING ───────────────────────────────────────────────
('Forward Roll', 'tumbling_standing', 1, 7, 'level_appropriate', 'Basic forward roll'),
('Straddle Roll', 'tumbling_standing', 1, 7, 'level_appropriate', 'Straddle position forward roll'),
('Backward Roll', 'tumbling_standing', 1, 7, 'level_appropriate', 'Basic backward roll'),
('Handstand', 'tumbling_standing', 1, 7, 'level_appropriate', 'Held handstand'),
('Cartwheel', 'tumbling_standing', 1, 7, 'level_appropriate', 'Standing cartwheel'),
('Back Limber', 'tumbling_standing', 1, 7, 'level_appropriate', 'Back limber from standing'),
('Front Limber', 'tumbling_standing', 1, 7, 'level_appropriate', 'Front limber from standing'),
('Backbend Kickover', 'tumbling_standing', 1, 7, 'level_appropriate', 'Backbend to kickover'),
('Front Walkover', 'tumbling_standing', 1, 7, 'advanced', 'Standing front walkover'),
('Back Walkover', 'tumbling_standing', 1, 7, 'advanced', 'Standing back walkover'),
('Handstand Forward Roll', 'tumbling_standing', 1, 7, 'advanced', 'Handstand to forward roll'),
('Back Extension Roll', 'tumbling_standing', 1, 7, 'advanced', 'Back extension roll'),
('Valdez', 'tumbling_standing', 1, 7, 'advanced', 'Valdez from standing'),

-- ─── LEVEL 1 TUMBLING RUNNING ────────────────────────────────────────────────
('Round Off', 'tumbling_running', 1, 7, 'level_appropriate', 'Running round off'),
('Round Off + Back Walkover', 'tumbling_running', 1, 7, 'advanced', 'Round off to back walkover'),
('Front Walkover Running', 'tumbling_running', 1, 7, 'advanced', 'Running front walkover'),
('Front Walkover Series', 'tumbling_running', 1, 7, 'advanced', 'Running front walkover series'),

-- ─── LEVEL 1 STUNTS ──────────────────────────────────────────────────────────
('Back Stand', 'stunt_two_leg', 1, 7, 'level_appropriate', 'Two-leg back stand stunt'),
('Prep Level Show and Go', 'stunt_two_leg', 1, 7, 'level_appropriate', 'Prep level show and go'),
('Flat Back', 'stunt_two_leg', 1, 7, 'level_appropriate', 'Flat back stunt'),
('Extended Flat Back', 'stunt_two_leg', 1, 7, 'level_appropriate', 'Extended flat back'),
('Shoulder Stand', 'stunt_two_leg', 1, 7, 'level_appropriate', 'Shoulder stand two-leg'),
('Straddle Sit', 'stunt_two_leg', 1, 7, 'level_appropriate', 'Straddle sit on bases'),
('Below Prep Level 1-Leg', 'stunt_one_leg', 1, 7, 'level_appropriate', 'One-leg stunt below prep level'),
('Prep Level 1-Leg with Bracer', 'stunt_one_leg', 1, 7, 'level_appropriate', 'Prep level one-leg with bracer'),
('Chair', 'stunt_one_leg', 1, 7, 'level_appropriate', 'Chair stunt'),
('Shoulder Sit', 'stunt_one_leg', 1, 7, 'level_appropriate', 'Shoulder sit'),

-- ─── LEVEL 1 JUMPS ───────────────────────────────────────────────────────────
('Toe Touch', 'jump', 1, 7, 'level_appropriate', 'Toe touch jump'),
('Hurdler Right', 'jump', 1, 7, 'level_appropriate', 'Right hurdler jump'),
('Hurdler Left', 'jump', 1, 7, 'level_appropriate', 'Left hurdler jump'),
('Pike', 'jump', 1, 7, 'level_appropriate', 'Pike jump'),

-- ─── LEVEL 2 TUMBLING STANDING ───────────────────────────────────────────────
('Back Handspring', 'tumbling_standing', 2, 7, 'level_appropriate', 'Standing back handspring'),
('Back Handspring Step Out', 'tumbling_standing', 2, 7, 'level_appropriate', 'BHS step out'),
('Straight Jump + BHS', 'tumbling_standing', 2, 7, 'level_appropriate', 'Straight jump into back handspring'),
('Back Walkover + BHS', 'tumbling_standing', 2, 7, 'level_appropriate', 'Back walkover to BHS'),
('BHS Series', 'tumbling_standing', 2, 7, 'advanced', 'Multiple back handsprings'),
('Valdez + BHS', 'tumbling_standing', 2, 7, 'advanced', 'Valdez to back handspring'),

-- ─── LEVEL 2 TUMBLING RUNNING ────────────────────────────────────────────────
('Cartwheel + BHS', 'tumbling_running', 2, 7, 'level_appropriate', 'Running cartwheel to BHS'),
('Round Off + BHS', 'tumbling_running', 2, 7, 'level_appropriate', 'Round off to back handspring'),
('Round Off + BHS Step Out', 'tumbling_running', 2, 7, 'level_appropriate', 'Round off to BHS step out'),
('Round Off + BHS Series', 'tumbling_running', 2, 7, 'elite', 'Round off to 3+ BHS'),
('Front Handspring', 'tumbling_running', 2, 7, 'elite', 'Running front handspring'),
('Bounder/Flyspring', 'tumbling_running', 2, 7, 'elite', 'Running bounder or flyspring'),

-- ─── LEVEL 2 STUNTS ──────────────────────────────────────────────────────────
('Prep Level 1-Leg (no brace)', 'stunt_one_leg', 2, 7, 'level_appropriate', 'Prep level one-leg without bracer'),
('Extension', 'stunt_two_leg', 2, 7, 'level_appropriate', 'Full extension two-leg stunt'),
('Barrel Roll', 'stunt_two_leg', 2, 7, 'level_appropriate', 'Barrel roll transition'),
('Leap Frog', 'stunt_two_leg', 2, 7, 'level_appropriate', 'Leap frog stunt'),
('Half Twisting Inversion to Extended Stunt', 'stunt_two_leg', 2, 7, 'advanced', 'Half twist inversion to extension'),
('Basket Toss Straight Ride', 'basket_toss', 2, 7, 'level_appropriate', 'Basket toss with straight ride only'),

-- ─── LEVEL 3 TUMBLING ────────────────────────────────────────────────────────
('BHS to Tuck', 'tumbling_standing', 3, 7, 'level_appropriate', 'Back handspring series to back tuck'),
('Jump + BHS Series', 'tumbling_standing', 3, 7, 'level_appropriate', 'Jump into BHS series'),
('Round Off + Tuck', 'tumbling_running', 3, 7, 'level_appropriate', 'Round off to back tuck'),
('Aerial', 'tumbling_running', 3, 7, 'level_appropriate', 'Running aerial cartwheel'),
('Punch Front', 'tumbling_running', 3, 7, 'level_appropriate', 'Running punch front flip'),
('Round Off + BHS + Tuck', 'tumbling_running', 3, 7, 'level_appropriate', 'Full running tumbling pass to tuck'),

-- ─── LEVEL 3 STUNTS ──────────────────────────────────────────────────────────
('Extended Lib', 'stunt_one_leg', 3, 7, 'level_appropriate', 'Extended liberty stunt'),
('Suspended Front Flip', 'stunt_one_leg', 3, 7, 'level_appropriate', 'Suspended front flip from stunt'),
('Full Twisting Transition', 'stunt_one_leg', 3, 7, 'level_appropriate', 'Full twisting stunt transition'),
('Release to Prep or Below', 'stunt_two_leg', 3, 7, 'level_appropriate', 'Release move catching at prep or below'),

-- ─── LEVEL 4 TUMBLING ────────────────────────────────────────────────────────
('Back Tuck', 'tumbling_standing', 4, 7, 'level_appropriate', 'Standing back tuck'),
('Multiple Back Tucks', 'tumbling_standing', 4, 7, 'level_appropriate', 'Multiple standing back tucks'),
('Jump + Back Tuck', 'tumbling_standing', 4, 7, 'level_appropriate', 'Jump to standing back tuck'),
('Round Off + BHS + Layout', 'tumbling_running', 4, 7, 'level_appropriate', 'Running pass to layout'),
('Running Whip to Layout', 'tumbling_running', 4, 7, 'level_appropriate', 'Running whip to layout'),

-- ─── LEVEL 4 STUNTS ──────────────────────────────────────────────────────────
('Full Twisting Mount to Extended 2-Leg', 'stunt_two_leg', 4, 7, 'level_appropriate', 'Full twisting mount to extended two-leg'),
('Double Twisting Dismount 2-Leg', 'stunt_two_leg', 4, 7, 'level_appropriate', 'Double twisting dismount from two-leg'),
('Release to Extended Single-Leg', 'stunt_one_leg', 4, 7, 'level_appropriate', 'Release move to extended single-leg stunt'),

-- ─── LEVEL 5 TUMBLING ────────────────────────────────────────────────────────
('BHS + Full', 'tumbling_standing', 5, 7, 'level_appropriate', 'BHS to full twisting layout'),
('Standing Full', 'tumbling_standing', 5, 7, 'level_appropriate', 'Standing full twisting layout'),
('Standing Double Full', 'tumbling_standing', 5, 7, 'advanced', 'Standing double full'),
('Round Off + BHS + Full', 'tumbling_running', 5, 7, 'level_appropriate', 'Running pass to full'),
('Running Double Full', 'tumbling_running', 5, 7, 'advanced', 'Running double full twisting layout'),

-- ─── LEVEL 6 TUMBLING ────────────────────────────────────────────────────────
('Standing Double Full L6', 'tumbling_standing', 6, 7, 'level_appropriate', 'Level 6 standing double full'),
('Running Double Full L6', 'tumbling_running', 6, 7, 'level_appropriate', 'Level 6 running double full (min 2 BHS)'),

-- ─── LEVEL 6 STUNTS ──────────────────────────────────────────────────────────
('Double-Up to Extended 2-Leg', 'stunt_two_leg', 6, 7, 'level_appropriate', 'Double-up to extended two-leg'),
('Double-Up to Extended 1-Leg', 'stunt_one_leg', 6, 7, 'level_appropriate', 'Double-up to extended one-leg'),
('2.25 Twist Dismount', 'stunt_two_leg', 6, 7, 'level_appropriate', '2.25 twist dismount from stunt'),
('Rewind to Extended', 'stunt_two_leg', 6, 7, 'level_appropriate', 'Rewind to extended stunt'),

-- ─── LEVEL 7 TUMBLING ────────────────────────────────────────────────────────
('BHS to Double Full', 'tumbling_standing', 7, 7, 'level_appropriate', 'BHS directly to double full'),

-- ─── FLYING SKILLS ───────────────────────────────────────────────────────────
('Heel Stretch', 'flying', 1, 7, 'level_appropriate', 'Heel stretch flexibility skill'),
('Scorpion', 'flying', 2, 7, 'advanced', 'Scorpion flexibility skill'),
('Bow and Arrow', 'flying', 3, 7, 'advanced', 'Bow and arrow flexibility skill'),
('Needle', 'flying', 3, 7, 'advanced', 'Needle flexibility skill'),
('Full Down Dismount', 'flying', 3, 7, 'level_appropriate', 'Full twisting dismount'),
('Double Down Dismount', 'flying', 5, 7, 'level_appropriate', 'Double twisting dismount'),

-- ─── BASE SKILLS ─────────────────────────────────────────────────────────────
('Main Base Prep Level', 'base', 1, 7, 'level_appropriate', 'Main base at prep level'),
('Main Base Extension', 'base', 2, 7, 'level_appropriate', 'Main base at extension level'),
('Side Base Prep Level', 'base', 1, 7, 'level_appropriate', 'Side base at prep level'),
('Side Base Extension', 'base', 2, 7, 'level_appropriate', 'Side base at extension level'),

-- ─── BACK SPOT SKILLS ────────────────────────────────────────────────────────
('Back Spot Prep Level', 'back_spot', 1, 7, 'level_appropriate', 'Back spotting at prep level'),
('Back Spot Extension', 'back_spot', 2, 7, 'level_appropriate', 'Back spotting at extension level'),
('Back Spot Tosses', 'back_spot', 2, 7, 'level_appropriate', 'Back spotting basket tosses'),

-- ─── FRONT SPOT SKILLS ───────────────────────────────────────────────────────
('Front Spot Prep Level', 'front_spot', 1, 7, 'level_appropriate', 'Front spotting at prep level'),
('Front Spot Extension', 'front_spot', 2, 7, 'level_appropriate', 'Front spotting at extension level');

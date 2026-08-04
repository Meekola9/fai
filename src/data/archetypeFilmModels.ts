// ---------------------------------------------------------------------------
// FAI Archetype Film Model Library — runtime data transcribed from
// docs/archetype-film-model-library.md. Each entry maps an archetype id to
// professional and college film teaching references plus a study focus.
//
// These are teaching references, NOT claims that testing proves technique,
// instincts, production, or football IQ. The athlete's FAI archetype id is
// never changed by film similarity — film confirms or challenges the
// projection.
// ---------------------------------------------------------------------------

export interface ArchetypeFilmModel {
  /** Display name of the archetype (kept in sync with the archetype catalog). */
  faiName: string
  /** Professional (NFL) teaching model. */
  nfl: string
  /** College film model, as "Player — School" (or descriptive film note). */
  college: string
  /** What to study on the film, rather than merely watching highlights. */
  focus: string
}

export const ARCHETYPE_FILM_MODELS: Readonly<Record<string, ArchetypeFilmModel>> = {
  // Quarterback
  'qb-field-general': { faiName: 'Field General', nfl: 'Joe Burrow', college: 'Joe Burrow — LSU', focus: 'Protection command, coverage identification, pocket sequencing' },
  'qb-gunslinger': { faiName: 'Gunslinger', nfl: 'Josh Allen', college: 'Josh Allen — Wyoming', focus: 'Velocity from imperfect platforms, deep-out timing, aggressive window selection' },
  'qb-point-guard': { faiName: 'Floor General', nfl: 'Jalen Hurts', college: 'Jalen Hurts — Oklahoma', focus: 'Distribution, option decisions, movement that preserves throwing structure' },
  'qb-escape-artist': { faiName: 'Escape Artist', nfl: 'Lamar Jackson', college: 'Lamar Jackson — Louisville', focus: 'Pressure escape paths, pocket exits, open-field leverage' },
  'qb-bulldozer': { faiName: 'Bulldozer QB', nfl: 'Cam Newton', college: 'Cam Newton — Auburn', focus: 'Designed-run finish, short-yardage pad level, power after contact' },
  'qb-raw-cannon': { faiName: 'Live Arm', nfl: 'Anthony Richardson', college: 'Anthony Richardson — Florida', focus: 'Arm strength, explosive off-platform throws, mechanical consistency needs' },
  'qb-rhythm-passer': { faiName: 'Rhythm Passer', nfl: 'Tua Tagovailoa', college: 'Tua Tagovailoa — Alabama', focus: 'Catch-and-throw rhythm, anticipation, lower-body timing' },

  // Running back
  'rb-downhill-hammer': { faiName: 'Downhill Hammer', nfl: 'Nick Chubb', college: 'Nick Chubb — Georgia', focus: 'Pressing downhill tracks, square cuts, contact balance' },
  'rb-one-cut-slasher': { faiName: 'One-Cut Slasher', nfl: 'Jonathan Taylor', college: 'Jonathan Taylor — Wisconsin', focus: 'Read-to-cut timing, foot in ground, acceleration through daylight' },
  'rb-satellite-back': { faiName: 'Satellite Back', nfl: 'Christian McCaffrey', college: 'Jahmyr Gibbs — Alabama', focus: 'Space routes, option leverage, screen tempo' },
  'rb-bell-cow': { faiName: 'Bell Cow', nfl: 'Derrick Henry', college: 'Derrick Henry — Alabama', focus: 'Workload consistency, late-game efficiency, finishing runs' },
  'rb-jitterbug': { faiName: 'Jitterbug', nfl: 'LeSean McCoy', college: 'Reggie Bush — USC', focus: 'Short-area deception, jump cuts, defender manipulation' },
  'rb-battering-ram': { faiName: 'Battering Ram', nfl: 'Marshawn Lynch', college: 'Blake Corum — Michigan', focus: 'Low pads, leg drive, falling forward through contact' },
  'rb-track-star-convert': { faiName: 'Track Star Convert', nfl: 'Raheem Mostert', college: 'Devon Achane — Texas A&M', focus: 'Track speed translated to run angles, patience before acceleration, perimeter finish' },

  // Wide receiver
  'wr-field-stretcher': { faiName: 'Field Stretcher', nfl: 'Tyreek Hill', college: 'Jameson Williams — Alabama', focus: 'Stack releases, speed control, tracking deep balls' },
  'wr-chain-mover': { faiName: 'Chain Mover', nfl: 'Amon-Ra St. Brown', college: 'Cooper Kupp — Eastern Washington', focus: 'Landmark discipline, leverage reads, reliable third-down separation' },
  'wr-big-body-boundary': { faiName: 'Big Body Boundary', nfl: 'Mike Evans', college: 'Drake London — USC', focus: 'Boundary releases, body positioning, back-shoulder timing' },
  'wr-route-technician': { faiName: 'Route Technician', nfl: 'Davante Adams', college: 'Jerry Jeudy — Alabama', focus: 'Release plans, breakpoint violence, stem manipulation' },
  'wr-yards-after-menace': { faiName: 'Yards-After Menace', nfl: 'Deebo Samuel', college: 'Deebo Samuel — South Carolina', focus: 'Catch-to-run transition, contact navigation, designed-touch efficiency' },
  'wr-contested-catch-freak': { faiName: 'Contested Catch Freak', nfl: 'Calvin Johnson', college: 'Rome Odunze — Washington', focus: 'Late hands, high-point timing, vertical body control' },
  'wr-straight-line-blur': { faiName: 'Straight Line Blur', nfl: 'DK Metcalf', college: 'DK Metcalf — Ole Miss', focus: 'Vertical stem, stacking, maintaining speed through contact' },
  'wr-gadget-weapon': { faiName: 'Gadget Weapon', nfl: 'Percy Harvin', college: 'Percy Harvin — Florida', focus: 'Motion usage, backfield transitions, space-touch versatility' },

  // Tight end
  'te-move-piece': { faiName: 'Move Piece', nfl: 'Evan Engram', college: 'Brock Bowers — Georgia', focus: 'Alignment versatility, motion, separation against linebackers' },
  'te-inline-mauler': { faiName: 'In-Line Mauler', nfl: 'George Kittle', college: 'Darnell Washington — Georgia', focus: 'Hand placement, hip roll, sustaining edge blocks' },
  'te-seam-buster': { faiName: 'Seam Buster', nfl: 'Travis Kelce', college: 'Kyle Pitts — Florida', focus: 'Seam leverage, zone-window pacing, vertical mismatch creation' },
  'te-basketball-body': { faiName: 'Basketball Body', nfl: 'Jimmy Graham', college: 'Antonio Gates — Kent State basketball transition film', focus: 'Rebounding position, red-zone body control, catch radius' },
  'te-hybrid-h-back': { faiName: 'Hybrid H-Back', nfl: 'Kyle Juszczyk', college: 'Chigoziem Okonkwo — Maryland', focus: 'Insert blocks, split-flow action, route/block disguise' },

  // Offensive line
  'ol-anchor-tackle': { faiName: 'Anchor Tackle', nfl: 'Trent Williams', college: 'Penei Sewell — Oregon', focus: 'Independent hands, anchor recovery, edge-rush range' },
  'ol-road-grader': { faiName: 'Road Grader', nfl: 'Quenton Nelson', college: 'Tyler Smith — Tulsa', focus: 'Displacement, double-team movement, finish without overextension' },
  'ol-puller': { faiName: 'Puller', nfl: 'Zack Martin', college: 'Jackson Powers-Johnson — Oregon', focus: 'Pull path, target selection, balance in space' },
  'ol-pass-pro-technician': { faiName: 'Pass Pro Technician', nfl: 'Lane Johnson', college: 'Rashawn Slater — Northwestern', focus: 'Set variation, hand timing, inside-counter recovery' },
  'ol-phone-booth-brawler': { faiName: 'Phone Booth Brawler', nfl: 'Jason Kelce', college: 'Creed Humphrey — Oklahoma', focus: 'Leverage in tight space, combo blocks, interior recovery' },
  'ol-clay-frame': { faiName: 'Project Tackle', nfl: 'Jordan Mailata', college: 'Jordan Mailata developmental film', focus: 'Stance consistency, strike timing, converting frame into functional technique' },
  'ol-space-eater': { faiName: 'Space Eater', nfl: 'Mekhi Becton', college: 'Amarius Mims — Georgia', focus: 'Mass with balance, lane occupation, controlling width' },

  // Defensive line
  'dl-gap-plugger': { faiName: 'Gap Plugger', nfl: 'D.J. Reader', college: 'Jordan Davis — Georgia', focus: 'Double-team anchor, gap integrity, block recognition' },
  'dl-penetrator': { faiName: 'Penetrator', nfl: 'Aaron Donald', college: 'Ed Oliver — Houston', focus: 'First-step win, hand quickness, backfield angle' },
  'dl-bull-rusher': { faiName: 'Bull Rusher', nfl: 'Chris Jones', college: 'Derrick Brown — Auburn', focus: 'Long-arm conversion, power through half-man, pocket collapse' },
  'dl-bend-specialist': { faiName: 'Bend Specialist', nfl: 'Calais Campbell', college: 'Arik Armstead — Oregon', focus: 'Length through edges, hip flexibility, reducing surface area' },
  'dl-two-gapper': { faiName: 'Two-Gapper', nfl: 'Vita Vea', college: 'Dexter Lawrence — Clemson', focus: 'Lockout, peek-and-shed, controlling both adjacent gaps' },
  'dl-twitch-freak': { faiName: 'Twitch Freak', nfl: 'Ed Oliver', college: 'Jalen Carter — Georgia', focus: 'Sudden lateral entry, counter quickness, gap disruption' },
  'dl-motor-guy': { faiName: 'Motor Guy', nfl: 'Maxx Crosby', college: 'Braden Fiske — Florida State', focus: 'Pursuit after initial loss, second effort, snap-to-snap strain' },

  // Edge / outside linebacker
  'edge-speed-rusher': { faiName: 'Speed Rusher', nfl: 'Von Miller', college: 'Will Anderson Jr. — Alabama', focus: 'Get-off, cornering angle, speed-to-counter sequence' },
  'edge-power-convert': { faiName: 'Power Convert', nfl: 'Khalil Mack', college: 'Travon Walker — Georgia', focus: 'Speed-to-power, long arm, compressing the tackle’s set' },
  'edge-set-edge-setter': { faiName: 'Set Edge Setter', nfl: 'T.J. Watt', college: 'Aidan Hutchinson — Michigan', focus: 'Outside-arm leverage, block destruction, forcing runs inside' },
  'edge-length-freak': { faiName: 'Length Freak', nfl: 'Myles Garrett', college: 'Myles Garrett — Texas A&M', focus: 'Reach advantage, long-arm control, closing radius' },
  'edge-chase-athlete': { faiName: 'Chase Athlete', nfl: 'Micah Parsons', college: 'Micah Parsons — Penn State', focus: 'Backside pursuit, redirect speed, finishing from distance' },

  // Linebacker
  'lb-downhill-thumper': { faiName: 'Downhill Thumper', nfl: 'Fred Warner', college: 'Reuben Foster — Alabama', focus: 'Trigger downhill, take-on leverage, square tackling' },
  'lb-sideline-to-sideline': { faiName: 'Sideline-to-Sideline', nfl: 'Roquan Smith', college: 'Roquan Smith — Georgia', focus: 'Flow recognition, pursuit angle, closing in space' },
  'lb-coverage-backer': { faiName: 'Coverage Backer', nfl: 'Matt Milano', college: 'Jeremiah Owusu-Koramoah — Notre Dame', focus: 'Match leverage, zone spacing, transition against backs and tight ends' },
  'lb-green-dot': { faiName: 'Green Dot', nfl: 'Bobby Wagner', college: 'Luke Kuechly — Boston College', focus: 'Front communication, formation checks, diagnostic tempo' },
  'lb-blitz-specialist': { faiName: 'Blitz Specialist', nfl: 'Devin White', college: 'Devin White — LSU', focus: 'Timing, protection entry points, finishing through contact' },
  'lb-undersized-missile': { faiName: 'Guided Missile', nfl: 'Dre Greenlaw', college: 'Nakobe Dean — Georgia', focus: 'Fast trigger, slipping blocks, high-velocity tackling control' },

  // Cornerback
  'cb-press-bully': { faiName: 'Press Bully', nfl: 'Patrick Surtain II', college: 'Joey Porter Jr. — Penn State', focus: 'Jam timing, release disruption, catch-point control' },
  'cb-off-man-mirror': { faiName: 'Off-Man Mirror', nfl: 'Trent McDuffie', college: 'Denzel Ward — Ohio State', focus: 'Cushion control, transition efficiency, route matching' },
  'cb-ball-hawk': { faiName: 'Ball Hawk', nfl: 'Trevon Diggs', college: 'Trevon Diggs — Alabama', focus: 'Quarterback vision, route anticipation, ball tracking' },
  'cb-sticky-feet': { faiName: 'Sticky Feet', nfl: 'Jaire Alexander', college: 'Mike Sainristil — Michigan', focus: 'Hip switch, recovery steps, connection through breaks' },
  'cb-long-strider': { faiName: 'Long Strider', nfl: 'Tariq Woolen', college: 'Christian Gonzalez — Oregon', focus: 'Open-and-run mechanics, vertical phase, late length at catch point' },

  // Safety
  's-center-field-eraser': { faiName: 'Center Field Eraser', nfl: 'Earl Thomas', college: 'Malik Hooker — Ohio State', focus: 'Middle-of-field range, route overlap, high-point angles' },
  's-box-enforcer': { faiName: 'Box Enforcer', nfl: 'Derwin James Jr.', college: 'Jamal Adams — LSU', focus: 'Alley fit, block defeat, controlled impact tackling' },
  's-nickel-chess-piece': { faiName: 'Nickel Chess Piece', nfl: 'Antoine Winfield Jr.', college: 'Jalen Pitre — Baylor', focus: 'Slot matching, pressure disguise, run/pass role switching' },

  // Kicker / punter specialist fallbacks
  'kp-explosive-leg': { faiName: 'Explosive-Leg Specialist', nfl: 'Justin Tucker', college: 'Harrison Butker — Georgia Tech', focus: 'Approach consistency, leg speed, contact point' },
  'kp-coverage-speed': { faiName: 'Speed-Coverage Specialist', nfl: 'Jake Elliott', college: 'Evan McPherson — Florida', focus: 'Kickoff coverage transition, open-field leverage, safe tackling' },
  'kp-durable-dual': { faiName: 'Durable Dual Specialist', nfl: 'Michael Dickson', college: 'Matt Araiza — San Diego State', focus: 'Repeated-leg quality, kickoff/punt workload, technique under fatigue' },
  'kp-mobile-placement': { faiName: 'Mobile Placement Athlete', nfl: 'Johnny Hekker', college: 'Tory Taylor — Iowa', focus: 'Rollout punt mechanics, directional placement, movement consistency' },
  'kp-balanced': { faiName: 'Balanced Specialist', nfl: 'Younghoe Koo', college: 'Rodrigo Blankenship — Georgia', focus: 'Repeatable operation, placement consistency, general specialist athleticism' },
}

export function filmModelFor(archetypeId: string): ArchetypeFilmModel | undefined {
  return ARCHETYPE_FILM_MODELS[archetypeId]
}

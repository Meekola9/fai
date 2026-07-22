export interface ArchetypeMindsetGuide {
  /** A coaching projection for how the player can approach the role. */
  mindset: string
  /** Potential deployment ideas; final usage still depends on film, skill, and scheme. */
  onFieldUse: string
}

/**
 * Coaching language for every archetype currently exposed by FAI.
 * These are development and deployment projections, not personality diagnoses
 * or guarantees that an athlete already possesses the named football skill.
 */
export const ARCHETYPE_MINDSET_GUIDE: Record<string, ArchetypeMindsetGuide> = {
  // Quarterback
  'qb-field-general': {
    mindset: 'Control the game before trying to dominate it. Stay calm, understand the situation, distribute the ball, and make the offense right when the defense changes the picture.',
    onFieldUse: 'Best suited for a complete offense with protections, checks, RPO decisions, tempo control, third-down management, and full-field progression concepts.',
  },
  'qb-gunslinger': {
    mindset: 'Attack leverage and believe you can create explosive plays, while learning when the defense is baiting an unnecessary risk. Aggression should be calculated, not reckless.',
    onFieldUse: 'Can be featured in vertical play-action, deep outs, posts, field-side throws, movement launches, and shot packages that challenge tight windows.',
  },
  'qb-point-guard': {
    mindset: 'Think distribution first. Manipulate space, get playmakers touches, move defenders with your eyes and feet, and keep the offense operating efficiently.',
    onFieldUse: 'Fits spread formations, quick game, RPOs, option routes, motion-heavy packages, screens, sprint-outs, and controlled quarterback run answers.',
  },
  'qb-escape-artist': {
    mindset: 'Never panic when the first picture breaks down. Preserve the pass as long as possible, escape cleanly, and become a runner only when the defense forces that decision.',
    onFieldUse: 'Useful in boot action, sprint-outs, zone read, scramble-drill concepts, moving pockets, empty formations, and protection structures that create escape lanes.',
  },
  'qb-bulldozer': {
    mindset: 'Play with controlled physicality. Protect the football, finish behind your pads, and make the defense account for the quarterback as a legitimate interior runner.',
    onFieldUse: 'Can drive quarterback power, counter, bash, power read, short-yardage packages, red-zone runs, and four-minute offense while still supporting play-action.',
  },
  'qb-raw-cannon': {
    mindset: 'Embrace development without playing timid. Use natural explosiveness, simplify the mental picture, and stack technically sound repetitions until raw tools become reliable production.',
    onFieldUse: 'Can begin with half-field reads, defined shot plays, max-protection play-action, rollout throws, packaged deep routes, and selected designed runs.',
  },
  'qb-rhythm-passer': {
    mindset: 'Win with timing, repeatable footwork, and patience. Stay on schedule, take efficient completions, and make the same correct movement pattern under pressure.',
    onFieldUse: 'Fits quick game, West Coast concepts, glance and slant RPOs, three- and five-step timing, spacing, stick, mesh, and controlled play-action progression.',
  },

  // Running back
  'rb-downhill-hammer': {
    mindset: 'Press the aiming point, make one decisive cut, and punish hesitation. The goal is to create forward movement and make every tackle physically expensive.',
    onFieldUse: 'Ideal for inside zone, duo, power, iso, counter downhill tracks, four-minute offense, red-zone carries, and closing games behind double teams.',
  },
  'rb-one-cut-slasher': {
    mindset: 'Be patient until the crease declares, then become immediate and vertical. Avoid dancing behind the line and trust the blocking picture.',
    onFieldUse: 'Best in outside zone, wide zone, split flow, stretch, counter, and cutback concepts where the back can threaten width before attacking one crease.',
  },
  'rb-satellite-back': {
    mindset: 'Treat space as the matchup advantage. Avoid unnecessary square contact, identify leverage quickly, and force linebackers to defend the entire field.',
    onFieldUse: 'Can be used on screens, angle routes, option routes, swings, jet and orbit motion, empty formations, third downs, and two-back packages.',
  },
  'rb-bell-cow': {
    mindset: 'Own the complete workload. Protect the ball, handle contact, communicate in protection, and maintain the same decision quality late in the game.',
    onFieldUse: 'Projects as an every-down back for inside and outside runs, pass protection, checkdowns, screen game, goal-line work, and high-volume four-minute offense.',
  },
  'rb-jitterbug': {
    mindset: 'Make defenders commit their hips before you commit yours. Stay sudden, manipulate angles, and turn confined space into an advantage without running sideways unnecessarily.',
    onFieldUse: 'Useful on perimeter runs, toss, draws, screens, option routes, return duties, misdirection, and formations that isolate the back on linebackers.',
  },
  'rb-battering-ram': {
    mindset: 'Lower the game’s temperature through physical certainty. Run behind your pads, finish every carry, and consistently turn blocked yards into extra yards.',
    onFieldUse: 'Fits goal line, short yardage, iso, duo, power, lead, inside zone, clock-killing drives, and rotational packages designed to wear down a front.',
  },
  'rb-track-star-convert': {
    mindset: 'Use speed with discipline. Learn patience, ball security, protection, and contact balance so track explosiveness becomes repeatable football production.',
    onFieldUse: 'Can threaten outside zone, sweeps, toss, screens, draw, jet motion, kick returns, and change-of-pace packages that create open grass quickly.',
  },

  // Wide receiver
  'wr-field-stretcher': {
    mindset: 'Threaten the defender vertically on every release. Create fear with speed, maintain route discipline, and understand that clearing space can help the offense even without a target.',
    onFieldUse: 'Can run go routes, posts, deep overs, slot fades, clear-outs, switch releases, play-action shots, and motion releases that prevent clean jams.',
  },
  'wr-chain-mover': {
    mindset: 'Win the leverage needed for the down and distance. Be dependable, secure the catch, understand the sticks, and make the quarterback trust the route depth.',
    onFieldUse: 'Fits slants, sticks, option routes, digs, curls, spacing, mesh, shallow crossers, third-down packages, and possession work from the slot or boundary.',
  },
  'wr-big-body-boundary': {
    mindset: 'Treat the sideline as your ally, not a restriction. Use frame, positioning, and patience to own space and finish through contact.',
    onFieldUse: 'Can handle fades, back-shoulder throws, comebacks, boundary slants, glance routes, red-zone isolation, crack blocks, and possession targets outside the numbers.',
  },
  'wr-route-technician': {
    mindset: 'Create separation through detail. Sell the stem, control tempo, attack leverage, and repeat route mechanics instead of relying only on athletic superiority.',
    onFieldUse: 'Can operate a full route tree, option routes, choice concepts, motion releases, bunch adjustments, intermediate timing routes, and high-volume third-down work.',
  },
  'wr-yards-after-menace': {
    mindset: 'The catch begins the play rather than ending it. Secure the ball, transition immediately into a runner, and attack the leverage of the first defender.',
    onFieldUse: 'Useful on glance routes, drags, crossers, tunnel screens, bubbles, quick outs, slants, jet touch passes, and condensed formations that create traffic.',
  },
  'wr-contested-catch-freak': {
    mindset: 'Believe the football belongs to you, but win with positioning before relying on a difficult catch. Attack the highest safe point and finish strong through contact.',
    onFieldUse: 'Can be featured on fades, back shoulders, posts, deep curls, red-zone isolations, goal-line slants, scramble drills, and high-point boundary concepts.',
  },
  'wr-straight-line-blur': {
    mindset: 'Eliminate wasted motion and stack the defender quickly. Make every cushion feel temporary and force the secondary to protect vertical grass.',
    onFieldUse: 'Best on go routes, posts, deep overs, clear-outs, slot fades, jet motion, play-action shots, and routes designed to stretch safeties away from teammates.',
  },
  'wr-gadget-weapon': {
    mindset: 'Embrace multiple jobs and affect the defense even when the ball is not guaranteed. Learn alignments, motions, ball handling, and blocking details.',
    onFieldUse: 'Can be deployed on jet and orbit motion, screens, reverses, wildcat snaps, backfield alignments, return duties, pop passes, and manufactured-touch packages.',
  },

  // Tight end
  'te-move-piece': {
    mindset: 'Be formation-flexible and attack space. Learn the offense from several alignments so the defense cannot identify your assignment before the snap.',
    onFieldUse: 'Can align as a slot, wing, H-back, detached receiver, or motion player on seams, crossers, boots, split-flow action, screens, and matchup routes.',
  },
  'te-inline-mauler': {
    mindset: 'Set a physical edge and make blocking effort part of your identity. Strain through contact, then punish defenders who overplay the run with delayed releases.',
    onFieldUse: 'Fits attached-Y duty, down blocks, base blocks, split zone, counter kick-outs, duo, goal-line sets, chip releases, and play-action leak concepts.',
  },
  'te-seam-buster': {
    mindset: 'Attack the space between linebackers and safeties without drifting away from the quarterback’s window. Run vertically with confidence and finish through contact.',
    onFieldUse: 'Can stress defenses on seams, benders, pop passes, play-action crossers, Y-choice, red-zone divide routes, and RPO attachments behind linebackers.',
  },
  'te-basketball-body': {
    mindset: 'Use body control, timing, and frame like a rebounder. Establish position early and give the quarterback a large, protected target.',
    onFieldUse: 'Useful on red-zone fades, box-out routes, seams, high-low concepts, back shoulders, corner routes, play-action overs, and contested middle-field targets.',
  },
  'te-hybrid-h-back': {
    mindset: 'Value versatility and unglamorous work. Shift quickly between blocker, insert player, protector, motion threat, and outlet receiver.',
    onFieldUse: 'Can execute split zone, sift blocks, insert blocks, kick-outs, arc releases, flats, boots, screens, protection help, and two-back or condensed formations.',
  },

  // Offensive line
  'ol-anchor-tackle': {
    mindset: 'Stay calm on an island. Protect inside leverage, trust length and base, and make rushers take the longest path to the quarterback.',
    onFieldUse: 'Projects to offensive tackle in dropback protection, play-action, long-set situations, backside zone, wide zone, and schemes that require independent edge protection.',
  },
  'ol-road-grader': {
    mindset: 'Move the line of scrimmage and finish legally. Create displacement with leverage, leg drive, and strain rather than chasing highlight blocks.',
    onFieldUse: 'Fits guard or tackle work in duo, power, counter, gap schemes, down blocks, double teams, goal line, and short-yardage offense.',
  },
  'ol-puller': {
    mindset: 'Run to work, stay square, and arrive under control. Identify the correct color, adjust to movement, and strike without overrunning the target.',
    onFieldUse: 'Can excel on power, counter, pin-pull, trap, screens, perimeter lead concepts, and guard assignments requiring acceleration through space.',
  },
  'ol-pass-pro-technician': {
    mindset: 'Win the rep before heavy contact through patience, posture, and hand timing. Avoid lunging and force the rusher to reveal the move first.',
    onFieldUse: 'Fits tackle or guard in high-volume dropback systems, empty protection, quick-set plans, slide protection, and offenses that demand clean interior spacing.',
  },
  'ol-phone-booth-brawler': {
    mindset: 'Dominate confined space with leverage and toughness. Keep the fight vertical, maintain balance, and make interior defenders work through every snap.',
    onFieldUse: 'Best suited for guard or center in duo, inside zone, power, wedge, short yardage, double teams, and compact pass-protection environments.',
  },
  'ol-clay-frame': {
    mindset: 'Treat every rep as construction. Accept correction, build strength and movement skill, and focus on repeatable fundamentals rather than comparing current production to finished players.',
    onFieldUse: 'Can develop through swing-line duties, extra-offensive-lineman packages, junior-varsity repetitions, targeted technique work, and a gradual move toward tackle or interior line.',
  },
  'ol-space-eater': {
    mindset: 'Make defenders travel around your mass and keep the pocket structurally sound. Occupy width, absorb force, and prevent quick penetration.',
    onFieldUse: 'Projects to guard or center on double teams, inside zone, duo, pass-protection anchoring, goal line, wedge, and schemes that value interior pocket depth.',
  },

  // Defensive line
  'dl-gap-plugger': {
    mindset: 'Hold the point, make the ball declare, and understand that occupying blockers creates tackles for teammates. Do not abandon the gap chasing every backfield movement.',
    onFieldUse: 'Best at nose or one-technique in early downs, odd fronts, goal line, short yardage, zone-control plans, and fronts designed to keep linebackers clean.',
  },
  'dl-penetrator': {
    mindset: 'Attack the first available crease and disrupt timing before the offense can establish structure. Play fast, but stay responsible to the called gap.',
    onFieldUse: 'Fits three-technique, shaded interior alignments, slants, stunts, movement fronts, passing downs, and schemes that create one-on-one penetration opportunities.',
  },
  'dl-bull-rusher': {
    mindset: 'Convert get-off into force through the blocker’s center. Collapse space methodically and make the quarterback feel the pocket shrinking.',
    onFieldUse: 'Can play three-, four-, or five-technique with long-arm, power rush, pocket push, play-action control, and early-down run-to-pass responsibility.',
  },
  'dl-bend-specialist': {
    mindset: 'Win the edge with body angle, balance, and acceleration. Stay tight to the blocker and avoid running past the quarterback’s depth.',
    onFieldUse: 'Can be used in wide alignments, passing-down sub packages, stunt games, loop responsibilities, and rush plans that isolate tackles in space.',
  },
  'dl-two-gapper': {
    mindset: 'Control the blocker first, read the backfield second, and shed when the ball commits. Patience and hand placement matter more than immediate penetration.',
    onFieldUse: 'Fits nose, four-technique, or five-technique in odd fronts, read-and-react systems, run-heavy situations, and structures that ask one defender to protect two gaps.',
  },
  'dl-twitch-freak': {
    mindset: 'Be the first body to create a problem. Vary cadence response, attack edges suddenly, and convert quickness into a controlled finish.',
    onFieldUse: 'Useful as a sub-package three-technique, movement rusher, stunt penetrator, slant player, and interior mismatch on obvious passing downs.',
  },
  'dl-motor-guy': {
    mindset: 'Assume the play is never over. Retrace screens, chase from the backside, finish second efforts, and make effort a dependable competitive advantage.',
    onFieldUse: 'Can thrive in a rotational front, pursuit-heavy defense, pressure packages, screen awareness duties, special teams, and long-drive situations.',
  },

  // Edge / outside linebacker
  'edge-speed-rusher': {
    mindset: 'Threaten the corner every snap and force the tackle to protect width. Use speed to create hesitation, then counter when the blocker oversets.',
    onFieldUse: 'Fits wide-five or nine-technique alignments, passing-down rush, overload pressure, stunt games, and fronts designed to isolate the edge against a tackle.',
  },
  'edge-power-convert': {
    mindset: 'Make blockers respect speed, then attack through their chest. Stay square enough to play the run while converting acceleration into pocket collapse.',
    onFieldUse: 'Can play five- or seven-technique, long-arm rush, edge-to-interior movement, early downs, reduced fronts, and power-based rush-to-run assignments.',
  },
  'edge-set-edge-setter': {
    mindset: 'Keep the outside arm free, squeeze the run without losing contain, and force the ball back toward pursuit. Discipline is the primary weapon.',
    onFieldUse: 'Best at strong-side edge on early downs, tight-end surfaces, goal line, option responsibility, spill or box calls, and run-first fronts.',
  },
  'edge-length-freak': {
    mindset: 'Use reach to keep blockers away from your frame. Control contact early, close throwing lanes, and make every block begin at an uncomfortable distance.',
    onFieldUse: 'Can play edge, long-arm rusher, tight-end matchup, passing-lane disruptor, field-goal block unit, and fronts that value length at the point of attack.',
  },
  'edge-chase-athlete': {
    mindset: 'Pursue as though every play can return to you. Flatten cleanly from the backside, recognize boot and reverse action, and finish without overrunning the ball.',
    onFieldUse: 'Fits weak-side edge, backside zone-read responsibility, pursuit fronts, quarterback spy or chase roles, pressure packages, and multiple special-teams units.',
  },

  // Linebacker
  'lb-downhill-thumper': {
    mindset: 'Trigger decisively when the read confirms. Arrive square, take on blocks with leverage, and make interior runs feel crowded immediately.',
    onFieldUse: 'Projects to Mike or strong-side linebacker in A- and B-gap fits, goal line, run pressures, downhill zone fits, and short-yardage defense.',
  },
  'lb-sideline-to-sideline': {
    mindset: 'Run through open windows with clean angles rather than chasing the ball’s current location. Trust pursuit leverage and finish in space.',
    onFieldUse: 'Fits Will linebacker, scrape exchanges, outside-zone pursuit, quarterback spy, hook-to-flat expansion, and defenses that protect the runner from direct blocks.',
  },
  'lb-coverage-backer': {
    mindset: 'Think like a defensive back while maintaining linebacker toughness. Understand route distribution, communicate threats, and stay balanced through breaks.',
    onFieldUse: 'Can handle nickel packages, hook and curl zones, match coverage on backs and tight ends, Tampa carry, spy duty, and passing-down linebacker roles.',
  },
  'lb-green-dot': {
    mindset: 'Organize the defense before chasing your own production. Process formation, communicate checks, align teammates, and remain composed after offensive movement.',
    onFieldUse: 'Projects to Mike linebacker, front caller, motion adjuster, every-down communicator, pressure-check operator, and central player in multiple defensive structures.',
  },
  'lb-blitz-specialist': {
    mindset: 'Disguise intention, understand protection, time the cadence, and attack the crease with no wasted movement. Pressure must remain coordinated with coverage.',
    onFieldUse: 'Can be used in mugged A gaps, green-dog pressure, simulated pressure, cross-dog blitzes, edge insertion, and passing-down sub packages.',
  },
  'lb-undersized-missile': {
    mindset: 'Use speed as armor. Beat blockers to the spot, stay difficult to square up, and strike with leverage rather than trying to absorb size directly.',
    onFieldUse: 'Fits Will, rover, hybrid box defender, pressure player, quarterback spy, pursuit role, coverage unit, and multiple special-teams assignments.',
  },

  // Cornerback
  'cb-press-bully': {
    mindset: 'Own access to the route. Be patient at the line, use physicality within the rules, and make the receiver earn a clean release.',
    onFieldUse: 'Best at boundary press man, red-zone coverage, matchup assignments on larger receivers, Cover 1, Cover 0, and schemes with safety help defined elsewhere.',
  },
  'cb-off-man-mirror': {
    mindset: 'Stay patient, preserve leverage, and react to the receiver’s real break rather than every early movement. Drive downhill without surrendering the deep ball.',
    onFieldUse: 'Fits off-man, quarters match, Cover 3 bail, pattern-match systems, cushion technique, and downs where the corner must defend both vertical and underneath routes.',
  },
  'cb-ball-hawk': {
    mindset: 'Read the quarterback and route combination without abandoning coverage responsibility. Attack the catch point when the opportunity is earned.',
    onFieldUse: 'Can thrive in zone, trap coverage, quarters, Cover 2 corner technique, route-jump calls, and schemes that allow vision on the quarterback.',
  },
  'cb-sticky-feet': {
    mindset: 'Stay square, stay balanced, and never panic during transitions. Win with efficient footwork so recovery speed is a backup rather than the primary plan.',
    onFieldUse: 'Useful at slot or outside corner in man coverage, bunch checks, match coverage, short-area route defense, and assignments against sudden receivers.',
  },
  'cb-long-strider': {
    mindset: 'Use cushion, length, and recovery speed intelligently. Minimize false steps and avoid allowing a quicker receiver to turn long movement into wasted movement.',
    onFieldUse: 'Projects to outside corner, boundary or field bail technique, deep-third responsibility, press-bail, vertical matchup duty, and coverage against taller receivers.',
  },

  // Safety
  's-center-field-eraser': {
    mindset: 'Stay deeper than the deepest threat, read calmly, and take angles that remove explosive plays. Range only matters when discipline preserves it.',
    onFieldUse: 'Fits single-high post safety, middle-of-field closed coverage, deep-half overlap, quarters poach, route overlap, and emergency eraser responsibilities.',
  },
  's-box-enforcer': {
    mindset: 'Communicate first, fit the run with urgency, and arrive under control. Physicality must produce dependable tackles rather than reckless collisions.',
    onFieldUse: 'Can play strong safety, robber, down safety, tight-end matchup, alley fitter, goal line, pressure packages, and run-heavy early-down structures.',
  },
  's-nickel-chess-piece': {
    mindset: 'Solve changing problems snap to snap. Learn several alignments, disguise responsibility, and transition quickly between coverage, pressure, and run support.',
    onFieldUse: 'Fits Star or nickel, slot man coverage, match zones, edge blitz, box fits, motion adjustments, tight-end matchups, and three-safety packages.',
  },

  // Kicker / punter fallbacks
  'kp-explosive-leg': {
    mindset: 'Trust the operation, swing freely, and reset immediately after each attempt. Power should come from repeatable mechanics rather than forcing the kick.',
    onFieldUse: 'Can support long field goals, deep kickoffs, hang-time punts, field-position changes, and specialist packages where maximum distance matters.',
  },
  'kp-coverage-speed': {
    mindset: 'Finish the kick, then become a football player. Track the return, maintain leverage, and be willing to protect the coverage unit as the last defender.',
    onFieldUse: 'Useful on kickoff coverage, directional kicking, rugby or rollout punt support, fake opportunities, emergency tackle responsibility, and special-teams pursuit.',
  },
  'kp-durable-dual': {
    mindset: 'Value repetition quality and recovery. Maintain the same operation through a large workload and separate one poor attempt from the next snap.',
    onFieldUse: 'Can handle combined kicker-punter duties, high-practice-volume roles, kickoff and field-goal work, backup responsibilities, and roster-saving dual-specialist deployment.',
  },
  'kp-mobile-placement': {
    mindset: 'Stay athletic around imperfect conditions. Handle movement, poor snaps, changing launch points, and pressure without losing the core operation.',
    onFieldUse: 'Fits rugby punts, rollout punts, directional placement, fake packages, moving holds, emergency scramble situations, and coverage-aware specialist roles.',
  },
  'kp-balanced': {
    mindset: 'Choose consistency over occasional flash. Treat operation time, placement, communication, and emotional reset as equally important parts of the position.',
    onFieldUse: 'Projects as a dependable all-phase specialist for standard field goals, kickoffs, punts, holds, situational placement, and backup duties across units.',
  },
}

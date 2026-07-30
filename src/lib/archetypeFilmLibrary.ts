export type FilmModelLevel = 'NFL' | 'College' | 'Historical'
export type FilmModelFitTier = 'primary' | 'trait' | 'body-type' | 'development'

export interface ArchetypeFilmModel {
  archetypeId: string
  faiName: string
  positionGroup: string
  professionalModel: string
  collegeModel: string
  playStyle: string
  studyTopics: string[]
  levelSupport: FilmModelLevel[]
  fitTierSupport: FilmModelFitTier[]
  sourceUrl?: string
  clipStartSec?: number
  clipEndSec?: number
  coachNote?: string
  verified: boolean
}

const model = (
  archetypeId: string,
  faiName: string,
  positionGroup: string,
  professionalModel: string,
  collegeModel: string,
  playStyle: string,
  studyTopics: string[],
): ArchetypeFilmModel => ({
  archetypeId,
  faiName,
  positionGroup,
  professionalModel,
  collegeModel,
  playStyle,
  studyTopics,
  levelSupport: ['NFL', 'College', 'Historical'],
  fitTierSupport: ['primary', 'trait', 'body-type', 'development'],
  verified: false,
})

export const ARCHETYPE_FILM_LIBRARY: readonly ArchetypeFilmModel[] = [
  model('qb-field-general', 'Field General', 'QB', 'Joe Burrow', 'Joe Burrow — LSU', 'Balanced distributor whose command, protection control, and processing must be confirmed on film.', ['Protection command', 'Coverage identification', 'Pocket sequencing']),
  model('qb-gunslinger', 'Gunslinger', 'QB', 'Josh Allen', 'Josh Allen — Wyoming', 'Power-led passer who creates velocity and explosive throws from difficult platforms.', ['Imperfect-platform velocity', 'Deep-out timing', 'Aggressive window selection']),
  model('qb-point-guard', 'Floor General', 'QB', 'Jalen Hurts', 'Jalen Hurts — Oklahoma', 'Mobile distributor who keeps the offense on schedule through decisions and movement.', ['Distribution', 'Option decisions', 'Movement with throwing structure']),
  model('qb-escape-artist', 'Escape Artist', 'QB', 'Lamar Jackson', 'Lamar Jackson — Louisville', 'Dynamic creator who turns pressure into explosive off-schedule offense.', ['Pressure escape paths', 'Pocket exits', 'Open-field leverage']),
  model('qb-bulldozer', 'Bulldozer QB', 'QB', 'Cam Newton', 'Cam Newton — Auburn', 'Power runner at quarterback with short-yardage and designed-run value.', ['Designed-run finish', 'Short-yardage pad level', 'Power after contact']),
  model('qb-raw-cannon', 'Live Arm', 'QB', 'Anthony Richardson', 'Anthony Richardson — Florida', 'Explosive arm talent with high-end tools and developmental mechanical needs.', ['Arm strength', 'Off-platform throws', 'Mechanical consistency']),
  model('qb-rhythm-passer', 'Rhythm Passer', 'QB', 'Tua Tagovailoa', 'Tua Tagovailoa — Alabama', 'Timing passer who wins with anticipation and synchronized lower-body mechanics.', ['Catch-and-throw rhythm', 'Anticipation', 'Lower-body timing']),

  model('rb-downhill-hammer', 'Downhill Hammer', 'RB', 'Nick Chubb', 'Nick Chubb — Georgia', 'Square, decisive runner who presses downhill tracks and survives contact.', ['Downhill tracks', 'Square cuts', 'Contact balance']),
  model('rb-one-cut-slasher', 'One-Cut Slasher', 'RB', 'Jonathan Taylor', 'Jonathan Taylor — Wisconsin', 'Presses the aiming point, makes one decisive cut, and accelerates through daylight.', ['Read-to-cut timing', 'Foot in ground', 'Acceleration through daylight']),
  model('rb-satellite-back', 'Satellite Back', 'RB', 'Christian McCaffrey', 'Jahmyr Gibbs — Alabama', 'Space weapon with route, screen, and alignment versatility.', ['Space routes', 'Option leverage', 'Screen tempo']),
  model('rb-bell-cow', 'Bell Cow', 'RB', 'Derrick Henry', 'Derrick Henry — Alabama', 'Durable volume runner whose efficiency and finish hold up across a game.', ['Workload consistency', 'Late-game efficiency', 'Finishing runs']),
  model('rb-jitterbug', 'Jitterbug', 'RB', 'LeSean McCoy', 'Reggie Bush — USC', 'Short-area creator who manipulates defenders with sudden feet and deception.', ['Short-area deception', 'Jump cuts', 'Defender manipulation']),
  model('rb-battering-ram', 'Battering Ram', 'RB', 'Marshawn Lynch', 'Blake Corum — Michigan', 'Compact power runner who creates extra yards through leverage and leg drive.', ['Low pads', 'Leg drive', 'Falling forward']),
  model('rb-track-star-convert', 'Track Star Convert', 'RB', 'Raheem Mostert', 'Devon Achane — Texas A&M', 'Track-speed runner learning to translate patience and angles into football production.', ['Run angles', 'Patience before acceleration', 'Perimeter finish']),

  model('wr-field-stretcher', 'Field Stretcher', 'WR', 'Tyreek Hill', 'Jameson Williams — Alabama', 'Vertical speed threat who stacks coverage and tracks deep throws.', ['Stack releases', 'Speed control', 'Deep-ball tracking']),
  model('wr-chain-mover', 'Chain Mover', 'WR', 'Amon-Ra St. Brown', 'Cooper Kupp — Eastern Washington', 'Reliable separator who understands landmarks, leverage, and down-and-distance.', ['Landmark discipline', 'Leverage reads', 'Third-down separation']),
  model('wr-big-body-boundary', 'Big Body Boundary', 'WR', 'Mike Evans', 'Drake London — USC', 'Boundary target who wins with frame, positioning, and catch radius.', ['Boundary releases', 'Body positioning', 'Back-shoulder timing']),
  model('wr-route-technician', 'Route Technician', 'WR', 'Davante Adams', 'Jerry Jeudy — Alabama', 'Precision separator who wins before the break with releases and stem manipulation.', ['Release plans', 'Breakpoint violence', 'Stem manipulation']),
  model('wr-yards-after-menace', 'Yards-After Menace', 'WR', 'Deebo Samuel', 'Deebo Samuel — South Carolina', 'Designed-touch weapon who transitions instantly from receiver to runner.', ['Catch-to-run transition', 'Contact navigation', 'Designed-touch efficiency']),
  model('wr-contested-catch-freak', 'Contested Catch Freak', 'WR', 'Calvin Johnson', 'Rome Odunze — Washington', 'Vertical target with elite timing, body control, and high-point ability.', ['Late hands', 'High-point timing', 'Vertical body control']),
  model('wr-straight-line-blur', 'Straight Line Blur', 'WR', 'DK Metcalf', 'DK Metcalf — Ole Miss', 'Linear vertical threat who stresses leverage with size and speed.', ['Vertical stem', 'Stacking', 'Speed through contact']),
  model('wr-gadget-weapon', 'Gadget Weapon', 'WR', 'Percy Harvin', 'Percy Harvin — Florida', 'Multi-alignment playmaker used through motion, backfield touches, and space concepts.', ['Motion usage', 'Backfield transitions', 'Space-touch versatility']),

  model('te-move-piece', 'Move Piece', 'TE', 'Evan Engram', 'Brock Bowers — Georgia', 'Alignment-flexible mismatch who separates from linebackers and safeties.', ['Alignment versatility', 'Motion', 'Separation versus linebackers']),
  model('te-inline-mauler', 'In-Line Mauler', 'TE', 'George Kittle', 'Darnell Washington — Georgia', 'Physical attached tight end who creates movement and sustains edge blocks.', ['Hand placement', 'Hip roll', 'Sustaining edge blocks']),
  model('te-seam-buster', 'Seam Buster', 'TE', 'Travis Kelce', 'Kyle Pitts — Florida', 'Vertical interior threat who manipulates zone windows and matchup leverage.', ['Seam leverage', 'Zone-window pacing', 'Vertical mismatch creation']),
  model('te-basketball-body', 'Basketball Body', 'TE', 'Jimmy Graham', 'Antonio Gates — Kent State basketball transition film', 'Catch-radius target who uses rebounding position and body control.', ['Rebounding position', 'Red-zone body control', 'Catch radius']),
  model('te-hybrid-h-back', 'Hybrid H-Back', 'TE', 'Kyle Juszczyk', 'Chigoziem Okonkwo — Maryland', 'Backfield and wing utility player who disguises blocks and routes.', ['Insert blocks', 'Split-flow action', 'Route/block disguise']),

  model('ol-anchor-tackle', 'Anchor Tackle', 'OL', 'Trent Williams', 'Penei Sewell — Oregon', 'Edge protector with range, independent hands, and recovery strength.', ['Independent hands', 'Anchor recovery', 'Edge-rush range']),
  model('ol-road-grader', 'Road Grader', 'OL', 'Quenton Nelson', 'Tyler Smith — Tulsa', 'Displacement blocker who creates movement without losing balance.', ['Displacement', 'Double-team movement', 'Finish without overextension']),
  model('ol-puller', 'Puller', 'OL', 'Zack Martin', 'Jackson Powers-Johnson — Oregon', 'Mobile lineman who stays balanced and identifies targets in space.', ['Pull path', 'Target selection', 'Balance in space']),
  model('ol-pass-pro-technician', 'Pass Pro Technician', 'OL', 'Lane Johnson', 'Rashawn Slater — Northwestern', 'Controlled pass protector who wins with set variation and hand timing.', ['Set variation', 'Hand timing', 'Inside-counter recovery']),
  model('ol-phone-booth-brawler', 'Phone Booth Brawler', 'OL', 'Jason Kelce', 'Creed Humphrey — Oklahoma', 'Interior blocker built for leverage, combinations, and tight-space recovery.', ['Leverage in tight space', 'Combo blocks', 'Interior recovery']),
  model('ol-clay-frame', 'Project Tackle', 'OL', 'Jordan Mailata', 'Jordan Mailata developmental film', 'Developmental frame learning to convert size and movement into repeatable technique.', ['Stance consistency', 'Strike timing', 'Frame-to-technique development']),
  model('ol-space-eater', 'Space Eater', 'OL', 'Mekhi Becton', 'Amarius Mims — Georgia', 'Massive blocker who controls width and occupies lanes while staying balanced.', ['Mass with balance', 'Lane occupation', 'Controlling width']),

  model('dl-gap-plugger', 'Gap Plugger', 'DL', 'D.J. Reader', 'Jordan Davis — Georgia', 'Interior anchor who absorbs doubles and protects assigned gaps.', ['Double-team anchor', 'Gap integrity', 'Block recognition']),
  model('dl-penetrator', 'Penetrator', 'DL', 'Aaron Donald', 'Ed Oliver — Houston', 'Quick interior disruptor who wins first contact and enters the backfield.', ['First-step win', 'Hand quickness', 'Backfield angle']),
  model('dl-bull-rusher', 'Bull Rusher', 'DL', 'Chris Jones', 'Derrick Brown — Auburn', 'Power rusher who collapses the pocket through length and half-man leverage.', ['Long-arm conversion', 'Power through half-man', 'Pocket collapse']),
  model('dl-bend-specialist', 'Bend Specialist', 'DL', 'Calais Campbell', 'Arik Armstead — Oregon', 'Long front player who reduces surface area and works through edges.', ['Length through edges', 'Hip flexibility', 'Reducing surface area']),
  model('dl-two-gapper', 'Two-Gapper', 'DL', 'Vita Vea', 'Dexter Lawrence — Clemson', 'Control player who locks out, reads, and owns both adjacent gaps.', ['Lockout', 'Peek-and-shed', 'Two-gap control']),
  model('dl-twitch-freak', 'Twitch Freak', 'DL', 'Ed Oliver', 'Jalen Carter — Georgia', 'Sudden interior athlete with lateral entry and counter quickness.', ['Lateral entry', 'Counter quickness', 'Gap disruption']),
  model('dl-motor-guy', 'Motor Guy', 'DL', 'Maxx Crosby', 'Braden Fiske — Florida State', 'Relentless front player whose second effort changes plays.', ['Pursuit after initial loss', 'Second effort', 'Snap-to-snap strain']),

  model('edge-speed-rusher', 'Speed Rusher', 'EDGE', 'Von Miller', 'Will Anderson Jr. — Alabama', 'Explosive edge threat who wins the corner and converts speed into counters.', ['Get-off', 'Cornering angle', 'Speed-to-counter sequence']),
  model('edge-power-convert', 'Power Convert', 'EDGE', 'Khalil Mack', 'Travon Walker — Georgia', 'Edge defender who converts athletic momentum into tackle-compressing power.', ['Speed-to-power', 'Long arm', 'Compressing the set']),
  model('edge-set-edge-setter', 'Set Edge Setter', 'EDGE', 'T.J. Watt', 'Aidan Hutchinson — Michigan', 'Run-first edge who controls outside leverage and forces the ball inside.', ['Outside-arm leverage', 'Block destruction', 'Force responsibility']),
  model('edge-length-freak', 'Length Freak', 'EDGE', 'Myles Garrett', 'Myles Garrett — Texas A&M', 'Long explosive rusher who weaponizes reach and closing radius.', ['Reach advantage', 'Long-arm control', 'Closing radius']),
  model('edge-chase-athlete', 'Chase Athlete', 'EDGE', 'Micah Parsons', 'Micah Parsons — Penn State', 'Range defender who redirects and finishes from distance.', ['Backside pursuit', 'Redirect speed', 'Finishing from distance']),

  model('lb-downhill-thumper', 'Downhill Thumper', 'LB', 'Fred Warner', 'Reuben Foster — Alabama', 'Physical linebacker who triggers downhill and tackles square.', ['Downhill trigger', 'Take-on leverage', 'Square tackling']),
  model('lb-sideline-to-sideline', 'Sideline-to-Sideline', 'LB', 'Roquan Smith', 'Roquan Smith — Georgia', 'Range linebacker who diagnoses flow and closes in space.', ['Flow recognition', 'Pursuit angle', 'Closing in space']),
  model('lb-coverage-backer', 'Coverage Backer', 'LB', 'Matt Milano', 'Jeremiah Owusu-Koramoah — Notre Dame', 'Space defender who matches backs and tight ends while maintaining zone spacing.', ['Match leverage', 'Zone spacing', 'Transition versus backs and tight ends']),
  model('lb-green-dot', 'Green Dot', 'LB', 'Bobby Wagner', 'Luke Kuechly — Boston College', 'Diagnostic leader who aligns the front and communicates checks.', ['Front communication', 'Formation checks', 'Diagnostic tempo']),
  model('lb-blitz-specialist', 'Blitz Specialist', 'LB', 'Devin White', 'Devin White — LSU', 'Timed pressure player who attacks protection entry points.', ['Timing', 'Protection entry points', 'Finishing through contact']),
  model('lb-undersized-missile', 'Guided Missile', 'LB', 'Dre Greenlaw', 'Nakobe Dean — Georgia', 'High-velocity linebacker who slips blocks and arrives under control.', ['Fast trigger', 'Slipping blocks', 'Controlled high-speed tackling']),

  model('cb-press-bully', 'Press Bully', 'CB', 'Patrick Surtain II', 'Joey Porter Jr. — Penn State', 'Physical man corner who disrupts releases and controls the catch point.', ['Jam timing', 'Release disruption', 'Catch-point control']),
  model('cb-off-man-mirror', 'Off-Man Mirror', 'CB', 'Trent McDuffie', 'Denzel Ward — Ohio State', 'Controlled off-man defender who manages cushion and transitions efficiently.', ['Cushion control', 'Transition efficiency', 'Route matching']),
  model('cb-ball-hawk', 'Ball Hawk', 'CB', 'Trevon Diggs', 'Trevon Diggs — Alabama', 'Anticipatory corner who reads the quarterback and finishes on the football.', ['Quarterback vision', 'Route anticipation', 'Ball tracking']),
  model('cb-sticky-feet', 'Sticky Feet', 'CB', 'Jaire Alexander', 'Mike Sainristil — Michigan', 'Sudden mirror defender who stays connected through breaks and recovers quickly.', ['Hip switch', 'Recovery steps', 'Connection through breaks']),
  model('cb-long-strider', 'Long Strider', 'CB', 'Tariq Woolen', 'Christian Gonzalez — Oregon', 'Long-speed corner who opens, runs, and uses length late at the catch point.', ['Open-and-run mechanics', 'Vertical phase', 'Late length at catch point']),

  model('s-center-field-eraser', 'Center Field Eraser', 'S', 'Earl Thomas', 'Malik Hooker — Ohio State', 'Deep safety with route overlap range and high-point ability.', ['Middle-of-field range', 'Route overlap', 'High-point angles']),
  model('s-box-enforcer', 'Box Enforcer', 'S', 'Derwin James Jr.', 'Jamal Adams — LSU', 'Physical safety who fits alleys, defeats blocks, and tackles with control.', ['Alley fit', 'Block defeat', 'Controlled impact tackling']),
  model('s-nickel-chess-piece', 'Nickel Chess Piece', 'S', 'Antoine Winfield Jr.', 'Jalen Pitre — Baylor', 'Multi-role safety who can match slots, pressure, and switch run/pass responsibilities.', ['Slot matching', 'Pressure disguise', 'Run/pass role switching']),

  model('kp-explosive-leg', 'Explosive-Leg Specialist', 'K/P', 'Justin Tucker', 'Harrison Butker — Georgia Tech', 'Specialist with repeatable approach, leg speed, and contact quality.', ['Approach consistency', 'Leg speed', 'Contact point']),
  model('kp-coverage-speed', 'Speed-Coverage Specialist', 'K/P', 'Jake Elliott', 'Evan McPherson — Florida', 'Specialist with athletic value after the kick and in coverage space.', ['Coverage transition', 'Open-field leverage', 'Safe tackling']),
  model('kp-durable-dual', 'Durable Dual Specialist', 'K/P', 'Michael Dickson', 'Matt Araiza — San Diego State', 'Dual-role specialist who maintains leg quality across workload.', ['Repeated-leg quality', 'Kickoff/punt workload', 'Technique under fatigue']),
  model('kp-mobile-placement', 'Mobile Placement Athlete', 'K/P', 'Johnny Hekker', 'Tory Taylor — Iowa', 'Movement-capable punter with rollout and directional placement value.', ['Rollout mechanics', 'Directional placement', 'Movement consistency']),
  model('kp-balanced', 'Balanced Specialist', 'K/P', 'Younghoe Koo', 'Rodrigo Blankenship — Georgia', 'Well-rounded specialist with repeatable operation and placement.', ['Repeatable operation', 'Placement consistency', 'General specialist athleticism']),
]

export function filmModelForArchetype(archetypeId?: string): ArchetypeFilmModel | undefined {
  return archetypeId ? ARCHETYPE_FILM_LIBRARY.find((item) => item.archetypeId === archetypeId) : undefined
}

export function searchArchetypeFilmLibrary(input: {
  query?: string
  positionGroup?: string
  studyTopic?: string
}): ArchetypeFilmModel[] {
  const query = input.query?.trim().toLowerCase() ?? ''
  const topic = input.studyTopic?.trim().toLowerCase() ?? ''
  return ARCHETYPE_FILM_LIBRARY.filter((item) => {
    if (input.positionGroup && item.positionGroup !== input.positionGroup) return false
    if (topic && !item.studyTopics.some((entry) => entry.toLowerCase().includes(topic))) return false
    if (!query) return true
    return [
      item.faiName,
      item.archetypeId,
      item.positionGroup,
      item.professionalModel,
      item.collegeModel,
      item.playStyle,
      ...item.studyTopics,
    ].some((value) => value.toLowerCase().includes(query))
  })
}

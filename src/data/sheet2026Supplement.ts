import type { AppData, Athlete, TestSession } from '../types'

type Row = [
  name: string,
  gradYear: number,
  heightIn: number | null,
  weightLbs: number | null,
  benchSpring: number | null,
  squatSpring: number | null,
  benchSummer: number | null,
  dash40: number | null,
  fly10: number | null,
  powerClean: number | null,
  proAgility: number | null,
  lateral505: number | null,
  illinois: number | null,
  squatSummer: number | null,
  broadJump: number | null,
  verticalJump: number | null,
]

const ROWS: Row[] = [["E. Reynolds",2030,66,142,null,null,135,5.79,1.34,125,4.87,null,17.31,240,81.6,17],["A. Byrd",2030,70,157,null,null,195,4.72,1.07,195,4.57,2.62,16.18,330,105.96,25],["K. Byrd",2030,69,122,null,null,150,4.67,1.05,145,4.76,2.89,17.21,255,105.96,26],["E. Larimar",2030,68,157,null,null,275,4.97,1.17,190,4.9,3.07,16.25,325,84,10],["D. Hucheson",2030,70,171,null,null,190,5.55,1.29,170,5.1,3.04,18.09,250,80.4,10],["T. Graves",2030,69,139,null,null,150,5.14,1.19,145,4.87,2.92,16.22,245,79.2,24],["Kn. Crump",2030,73,172,null,null,160,5.18,1.25,155,4.9,2.82,16.32,235,86.28,24],["O. Keisel",2030,67,131,null,null,140,5.02,1.18,125,4.6,2.9,17.28,220,81.6,10],["R. Pendleton",2030,70,197,null,null,175,5.83,1.47,170,5.22,3.2,19.13,295,76.8,17],["J. Adams",2030,null,null,null,null,null,null,null,null,null,null,null,null,null,null],["K. Bryant",2030,71,189,null,null,170,5.57,1.38,140,5.05,null,18.23,235,69.6,18],["T. McCright",2030,71,218,null,null,185,5.57,1.28,145,5.09,3.34,17.68,315,81.6,21],["B. Quentin",2030,69,218,null,null,205,5.75,1.3,160,5.45,3.14,18.34,250,72,10],["C. Simpson",2030,68,220,null,null,165,6.39,1.56,135,5.72,3.79,19.78,275,68.4,14],["D. Carpenter",2030,74,258,null,null,175,6.25,1.64,145,5.77,3.44,22.21,235,62.4,16],["B.Bolton",2030,69,140,null,null,145,5.1,1.18,125,4.9,2.76,16.53,215,75.6,20],["P. Adcock",2030,67,121,null,null,120,5.59,1.28,125,5.08,2.99,16.94,200,91.2,18],["K. Bennett",2030,67,115,null,null,null,5.29,1.23,75,5.1,3.22,null,140,74.4,17],["M.Head",2030,70,163,null,null,115,6.22,1.46,145,5.64,3.34,16.71,200,67.2,16],["C. Barberra",2030,66,163,null,null,185,5.37,1.36,null,5.38,2.97,18.47,235,81.96,21],["B. White",2030,73,234,null,null,245,5.75,1.46,170,5.27,3.22,17.6,310,69.6,15],["Q. Smith",2029,70,188,245,380,255,4.98,1.16,175,null,2.86,16.41,450,96,25],["A. Franklin",2029,72,173,180,295,190,4.7,1.06,190,4.73,2.77,15.49,320,105.6,30],["B. Murphy",2029,64,133,160,282,160,5.25,1.19,155,4.69,2.84,15.66,246,106.8,15],["M. Corley",2029,null,null,null,null,null,null,null,null,null,null,null,null,null,null],["J. Eason",2029,71,172,null,305,205,4.59,1.02,200,4.42,2.69,15.46,340,104.4,26],["N. Mauldin",2029,69,171,150,255,175,5.84,1.38,145,5.26,3.09,17.04,365,74.4,15],["E. Duren",2029,75,177,195,315,200,5.14,1.23,175,5.17,3.19,17.74,345,72,23],["L.Boeving",2029,76,null,195,365,205,5.07,1.18,190,4.62,2.59,16.12,390,98.4,24],["C. Harden",2029,76,280,170,365,210,6.49,1.53,185,5.64,3.57,19.45,355,72,16],["C. Coles",2029,75,279,195,null,215,5.79,1.37,185,5.99,null,20.05,415,72,16],["J. Minnefield",2029,75,260,240,335,260,5.42,1.31,215,5.03,3.04,17.3,460,87.6,24],["B. Kitchens",2029,68,131,null,null,180,4.69,1.09,175,4.54,null,16.39,270,90,25],["AJ Gibbs",2029,65,100,null,null,115,4.79,1.14,145,4.48,2.57,16.65,245,97.2,19],["E. Bleshoy",2029,71,261,null,null,190,5.7,1.4,155,5.54,3.52,18.07,310,73.2,15],["D. Reynolds",2028,73,186,205,370,225,5.04,1.13,195,4.46,2.7,15.78,380,94.8,22],["A. Denny",2028,null,null,195,null,null,null,null,null,null,null,null,null,null,null],["E. Orgo",2028,71,141,185,355,null,4.77,1.05,190,4.21,2.81,15.71,425,88.8,26],["Ku. Crump",2028,75,191,195,390,200,4.57,1.1,225,4.47,2.71,16.48,460,117.6,27],["J. Rivers",2028,67,164,210,325,205,4.74,1.08,175,4.62,2.61,15.94,360,94.8,22],["G. Mobley",2028,72,233,230,315,235,5.29,1.3,215,5.01,2.91,17.5,450,82.8,23],["D. Hunt",2028,null,null,255,365,null,null,null,null,null,null,null,null,null,null],["B. Sorrow",2028,69,190,250,410,250,4.8,1.12,200,4.46,2.54,15.71,505,96,25],["S. Whatley",2028,null,null,205,320,null,null,null,null,null,null,null,null,null,null],["T. Smith",2028,75,187,230,380,235,4.99,1.09,185,4.4,2.6,15.79,400,111.6,27],["J. Pope",2028,76,206,null,380,210,4.92,1.08,null,4.54,2.66,15.93,410,86.4,24],["L. Grant",2028,75,240,175,null,175,6.15,1.45,175,5.49,null,18.4,345,72,17],["P. Stewart",2028,70,152,165,null,175,5.07,1.16,175,4.57,2.96,16.34,330,96,22],["C. Redd",2028,75,161,null,null,155,4.74,null,145,null,2.79,15.22,345,87.6,24],["T. Horton",2028,72,143,null,240,165,4.95,1.12,160,4.59,2.77,15.84,270,98.4,20],["B. Faustin",2028,69,183,null,null,235,4.74,1.11,185,4.77,2.81,15.97,385,96,26],["K. Wilson",2028,70,233,null,null,155,6.05,1.45,135,5.79,3.22,19.37,260,73.2,20],["A. Bryan",2027,70,279,260,null,null,5.67,1.32,null,5.28,3.07,17.64,null,81.6,18],["D. Usand",2027,68,166,null,null,275,4.47,1.04,245,4.37,null,null,490,102,31],["M. O'Donnell",2027,74,329,230,470,240,5.95,1.46,205,5.26,3.14,19.37,460,75.6,14],["R. Farmer",2027,69,165,null,null,230,4.64,1.02,235,4.49,2.76,15.25,405,99.6,25],["K. Cox",2027,69,173,245,null,250,5.05,1.17,185,4.39,2.87,16.11,425,99.6,23],["A. Anglin",2027,null,null,null,null,null,null,null,null,null,null,null,null,null,null],["E. Day",2027,71,204,250,455,255,5.24,1.25,200,4.7,2.84,16.91,505,90,25],["D. Brown",2027,69,175,190,345,180,6.05,1.44,160,5.38,3.37,18.83,320,75.6,17],["AJ Bailey",2027,76,184,245,null,250,4.49,1,255,4.27,2.7,14.66,410,108,36],["Coop. Davis",2027,74,260,245,null,260,5.39,1.36,195,4.78,3.04,17.55,460,81.6,22],["Q. Ander.Yates",2027,71,190,225,null,230,5.14,1.15,200,4.82,null,null,380,91.2,25],["K. Fears",2027,70,185,235,null,250,4.57,1.08,235,4.41,2.67,16.3,525,105.96,32],["E. Smith",2027,70,215,260,485,275,5,1.3,null,4.81,3.04,16.66,525,88.8,21],["X. Colclough",2027,72,231,250,470,260,5.46,1.32,215,4.73,3.01,16.39,525,94.8,18],["T. Green",2027,72,170,240,null,250,4.64,1.08,225,4.33,2.87,15.75,405,105.96,27],["D. Passmore",2027,72,198,330,null,330,4.64,1.1,265,4.39,2.68,15.98,485,99.6,28],["K. Boswell",2027,66,150,null,null,215,4.89,null,200,null,2.75,16.05,365,96,26],["B. Adams",2026,null,null,null,null,null,null,null,null,null,null,null,null,null,null],["L. Allgood",2026,null,null,null,null,null,null,null,null,null,null,null,null,null,null],["K. Box",2026,null,null,null,480,null,null,null,null,null,null,null,null,null,null],["C. Cleary",2026,null,null,null,null,null,null,null,null,null,null,null,null,null,null],["E. Pollard",2026,null,null,null,null,null,null,null,null,null,null,null,null,null,null],["E. Hamilton",2026,null,null,260,365,null,null,null,null,null,null,null,null,null,null],["K. Jones",2026,null,null,null,null,null,null,null,null,null,null,null,null,null,null],["C. Moore",2026,null,null,null,null,null,null,null,null,null,null,null,null,null,null],["N. Morrell",2026,null,null,null,null,null,null,null,null,null,null,null,null,null,null],["C. Phillips",2026,null,null,null,null,null,null,null,null,null,null,null,null,null,null],["JJ. Craft",2026,null,null,null,null,null,null,null,null,null,null,null,null,null,null]]

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function gradeForGradYear(gradYear: number): number {
  return Math.max(9, Math.min(12, 2038 - gradYear))
}

function athleteId(name: string, gradYear: number): string {
  return `athlete-sheet26-${slug(name)}-${gradYear}`
}

function sessionId(name: string, gradYear: number, phase: 'spring' | 'summer'): string {
  return `session-sheet26-${slug(name)}-${gradYear}-${phase}`
}

export function sheet2026SupplementData(): AppData {
  const athletes: Athlete[] = []
  const sessions: TestSession[] = []

  for (const [
    name,
    gradYear,
    heightIn,
    weightLbs,
    benchSpring,
    squatSpring,
    benchSummer,
    dash40,
    fly10,
    powerClean,
    proAgility,
    lateral505,
    illinois,
    squatSummer,
    broadJump,
    verticalJump,
  ] of ROWS) {
    const id = athleteId(name, gradYear)
    const grade = gradeForGradYear(gradYear)
    athletes.push({
      id,
      name,
      grade,
      position: 'ATH',
      positionGroup: 'ATH',
      heightIn: heightIn ?? 0,
      weightLbs: weightLbs ?? 0,
    })

    if (benchSpring !== null || squatSpring !== null) {
      sessions.push({
        id: sessionId(name, gradYear, 'spring'),
        athleteId: id,
        eventId: 'event-ccf7166d02f737',
        phase: 'Spring',
        date: '2026-04-15',
        createdAt: '2026-07-23T18:25:22.935Z',
        gradeSnapshot: grade,
        positionSnapshot: 'ATH',
        positionGroupSnapshot: 'ATH',
        weightLbsSnapshot: weightLbs ?? undefined,
        benchMax: benchSpring ?? undefined,
        squatMax: squatSpring ?? undefined,
      })
    }

    if (
      weightLbs !== null
      || benchSummer !== null
      || dash40 !== null
      || fly10 !== null
      || powerClean !== null
      || proAgility !== null
      || lateral505 !== null
      || illinois !== null
      || squatSummer !== null
      || broadJump !== null
      || verticalJump !== null
    ) {
      sessions.push({
        id: sessionId(name, gradYear, 'summer'),
        athleteId: id,
        eventId: 'event-7badc8422c3808',
        phase: 'Summer',
        date: '2026-06-15',
        createdAt: '2026-07-23T18:25:22.935Z',
        gradeSnapshot: grade,
        positionSnapshot: 'ATH',
        positionGroupSnapshot: 'ATH',
        weightLbsSnapshot: weightLbs ?? undefined,
        benchMax: benchSummer ?? undefined,
        dash40_1: dash40 ?? undefined,
        fly10_1: fly10 ?? undefined,
        powerCleanMax: powerClean ?? undefined,
        shuttle20_1: proAgility ?? undefined,
        latShuttle_1: lateral505 ?? undefined,
        illinois: illinois ?? undefined,
        squatMax: squatSummer ?? undefined,
        broadJump: broadJump ?? undefined,
        verticalJump: verticalJump ?? undefined,
      })
    }
  }

  return { athletes, events: [], sessions, plays: [], filmPlays: [] }
}

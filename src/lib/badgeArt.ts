import type { BadgeGroup } from './badges'

export interface BadgeArtSpec {
  group: BadgeGroup
  paths?: string[]
  fills?: string[]
  circles?: Array<{ cx: number; cy: number; r: number; fill?: boolean }>
  lines?: Array<{ x1: number; y1: number; x2: number; y2: number }>
  text?: string
  textSize?: number
}

/**
 * Hand-built, normalized 64x64 vector marks for every FAI player badge.
 * These are intentionally geometric and monochrome so the tier metal and
 * background pattern—not platform emoji rendering—control the visual system.
 */
export const BADGE_ART: Readonly<Record<string, BadgeArtSpec>> = {
  'first-mark': {
    group: 'testing',
    circles: [{ cx: 32, cy: 32, r: 15 }, { cx: 32, cy: 32, r: 5, fill: true }],
    lines: [
      { x1: 32, y1: 8, x2: 32, y2: 20 },
      { x1: 32, y1: 44, x2: 32, y2: 56 },
      { x1: 8, y1: 32, x2: 20, y2: 32 },
      { x1: 44, y1: 32, x2: 56, y2: 32 },
    ],
  },
  'combine-complete': {
    group: 'testing',
    paths: ['M13 18H51V50H13Z', 'M20 34L28 42L45 23'],
    lines: [
      { x1: 20, y1: 14, x2: 20, y2: 22 },
      { x1: 44, y1: 14, x2: 44, y2: 22 },
    ],
  },
  'battle-tested': {
    group: 'testing',
    paths: ['M32 8L52 16V31C52 43 44 52 32 57C20 52 12 43 12 31V16Z'],
    lines: [
      { x1: 23, y1: 26, x2: 41, y2: 26 },
      { x1: 23, y1: 33, x2: 41, y2: 33 },
      { x1: 23, y1: 40, x2: 41, y2: 40 },
    ],
  },
  'speed-demon': { group: 'performance', paths: ['M37 6L16 35H29L25 58L49 27H36Z'] },
  'rocket-start': {
    group: 'performance',
    paths: ['M22 43L30 19L45 8L42 25L22 43Z', 'M26 38L17 47L20 36Z', 'M35 29L47 26L39 38Z'],
    circles: [{ cx: 36, cy: 18, r: 3 }],
  },
  skywalker: {
    group: 'performance',
    paths: ['M32 10L41 23H35V47H29V23H23Z', 'M8 31L22 24L25 31L14 38Z', 'M56 31L42 24L39 31L50 38Z'],
  },
  'power-plant': {
    group: 'performance',
    paths: ['M32 8L38 22L53 16L46 31L58 38L42 40L40 56L31 44L18 54L21 39L7 33L22 28L18 13L30 22Z'],
    circles: [{ cx: 32, cy: 32, r: 7, fill: true }],
  },
  'range-hunter': {
    group: 'performance',
    circles: [{ cx: 29, cy: 34, r: 17 }, { cx: 29, cy: 34, r: 9 }, { cx: 29, cy: 34, r: 3, fill: true }],
    paths: ['M37 22L55 9L50 24L42 25Z'],
  },
  'cut-on-a-dime': {
    group: 'performance',
    paths: ['M11 19H34L27 12M34 19L27 26', 'M53 45H30L37 38M30 45L37 52', 'M34 19C46 20 48 27 45 32C42 37 34 36 30 45'],
  },
  'iron-lungs': {
    group: 'performance',
    paths: ['M29 18V35C29 45 23 51 14 49C8 47 8 39 11 31C14 23 20 17 26 15Z', 'M35 18V35C35 45 41 51 50 49C56 47 56 39 53 31C50 23 44 17 38 15Z'],
    lines: [{ x1: 32, y1: 10, x2: 32, y2: 37 }],
  },
  'trench-strong': {
    group: 'performance',
    paths: ['M9 19H25V31H9Z', 'M27 19H43V31H27Z', 'M45 19H55V31H45Z', 'M15 33H31V45H15Z', 'M33 33H49V45H33Z'],
    lines: [{ x1: 10, y1: 49, x2: 54, y2: 49 }],
  },
  'balanced-weapon': {
    group: 'performance',
    paths: ['M32 11V50', 'M17 20H47', 'M17 20L10 38H24Z', 'M47 20L40 38H54Z', 'M22 52H42'],
  },
  'no-weak-links': {
    group: 'performance',
    paths: ['M13 24C13 16 19 12 26 12H34V21H26C23 21 21 23 21 26C21 29 23 31 26 31H38', 'M51 40C51 48 45 52 38 52H30V43H38C41 43 43 41 43 38C43 35 41 33 38 33H26'],
  },
  'triple-threat': {
    group: 'performance',
    paths: ['M32 8L56 51H8Z'],
    circles: [{ cx: 32, cy: 22, r: 3, fill: true }, { cx: 21, cy: 42, r: 3, fill: true }, { cx: 43, cy: 42, r: 3, fill: true }],
  },
  'five-tool-athlete': {
    group: 'performance',
    paths: ['M32 7L56 25L47 54H17L8 25Z'],
    lines: [
      { x1: 32, y1: 17, x2: 32, y2: 32 },
      { x1: 32, y1: 32, x2: 46, y2: 27 },
      { x1: 32, y1: 32, x2: 41, y2: 46 },
      { x1: 32, y1: 32, x2: 23, y2: 46 },
      { x1: 32, y1: 32, x2: 18, y2: 27 },
    ],
    circles: [{ cx: 32, cy: 32, r: 4, fill: true }],
  },
  'twenty-mph-club': { group: 'club', text: '20', textSize: 25, paths: ['M10 48C19 39 16 27 24 20', 'M54 16C45 25 48 37 40 45'] },
  'nineteen-mph-club': { group: 'club', text: '19', textSize: 25, paths: ['M9 43H20', 'M44 21H56', 'M7 50H24'] },
  'four-fifty-club': { group: 'club', text: '4.50', textSize: 17, paths: ['M12 17H52', 'M12 48H52'] },
  'four-seventy-five-club': { group: 'club', text: '4.75', textSize: 17, paths: ['M12 17H52', 'M12 48H52'] },
  'big-man-burst': {
    group: 'club',
    paths: ['M19 16H45L51 25V47H13V25Z', 'M24 25H40V39H24Z'],
    lines: [
      { x1: 5, y1: 22, x2: 14, y2: 22 },
      { x1: 3, y1: 31, x2: 13, y2: 31 },
      { x1: 6, y1: 40, x2: 13, y2: 40 },
    ],
  },
  'ten-foot-club': {
    group: 'club', text: '10', textSize: 22,
    paths: ['M9 47H55V54H9Z'],
    lines: [
      { x1: 15, y1: 47, x2: 15, y2: 40 }, { x1: 23, y1: 47, x2: 23, y2: 42 },
      { x1: 32, y1: 47, x2: 32, y2: 40 }, { x1: 41, y1: 47, x2: 41, y2: 42 },
      { x1: 49, y1: 47, x2: 49, y2: 40 },
    ],
  },
  'thirty-five-inch-club': {
    group: 'club', text: '35', textSize: 19,
    paths: ['M13 45V16M13 16L7 24M13 16L19 24', 'M51 19V48M51 48L45 40M51 48L57 40'],
  },
  'clean-machine': {
    group: 'club',
    paths: ['M11 25H17V39H11Z', 'M18 21H24V43H18Z', 'M40 21H46V43H40Z', 'M47 25H53V39H47Z'],
    lines: [{ x1: 24, y1: 32, x2: 40, y2: 32 }],
  },
  'shuttle-technician': {
    group: 'club',
    paths: ['M8 22H47L40 15M47 22L40 29', 'M56 42H17L24 35M17 42L24 49'],
    circles: [{ cx: 32, cy: 32, r: 4, fill: true }],
  },
  'lateral-lock': {
    group: 'club',
    paths: ['M18 30V22C18 14 24 10 32 10C40 10 46 14 46 22V30', 'M13 29H51V51H13Z', 'M8 40H13M51 40H56'],
    circles: [{ cx: 32, cy: 40, r: 3, fill: true }],
  },
  'conditioning-engine': {
    group: 'club',
    paths: ['M17 18C25 10 39 10 47 18L52 13V28H37L43 22C37 17 27 17 21 23', 'M47 46C39 54 25 54 17 46L12 51V36H27L21 42C27 47 37 47 43 41'],
    circles: [{ cx: 32, cy: 32, r: 6, fill: true }],
  },
  riser: {
    group: 'progress',
    paths: ['M10 48H20V38H10Z', 'M27 48H37V28H27Z', 'M44 48H54V16H44Z', 'M12 28L28 18L38 22L53 9'],
  },
  'breakout-year': {
    group: 'progress',
    paths: ['M10 45H23V31H36V18H49', 'M39 18H55V34', 'M49 18L38 29', 'M8 52L20 46M22 52L28 46M36 52L41 46'],
  },
  'all-around-growth': {
    group: 'progress',
    circles: [{ cx: 32, cy: 34, r: 7, fill: true }],
    paths: ['M32 26V8M32 8L26 15M32 8L38 15', 'M26 32L11 22M11 22L20 22M11 22L15 31', 'M38 32L53 22M53 22L44 22M53 22L49 31', 'M28 40L20 54M36 40L44 54'],
  },
  'personal-best-parade': {
    group: 'progress',
    paths: ['M14 10V54', 'M16 13H43L36 23L43 33H16Z', 'M45 40L48 47L56 48L50 53L52 60L45 56L38 60L40 53L34 48L42 47Z'],
  },
  'fai-eighty-club': {
    group: 'ranking', text: '80', textSize: 22,
    paths: ['M18 49C10 42 9 31 15 21M46 49C54 42 55 31 49 21', 'M17 21L11 17M47 21L53 17'],
  },
  'fai-ninety-club': {
    group: 'ranking', text: '90', textSize: 22,
    paths: ['M32 7L52 20L45 50H19L12 20Z'],
  },
  'team-number-one': {
    group: 'ranking', text: '1', textSize: 28,
    paths: ['M14 23L20 10L32 20L44 10L50 23Z', 'M17 50H47'],
  },
  'podium-finisher': {
    group: 'ranking',
    paths: ['M8 37H23V53H8Z', 'M24 23H40V53H24Z', 'M41 31H56V53H41Z'],
    text: '1', textSize: 16,
  },
  'position-leader': {
    group: 'ranking',
    paths: ['M32 7C43 7 51 15 51 26C51 39 32 56 32 56C32 56 13 39 13 26C13 15 21 7 32 7Z'],
    circles: [{ cx: 32, cy: 26, r: 8 }],
    text: '1', textSize: 12,
  },
  'top-ten': {
    group: 'ranking', text: '10', textSize: 21,
    paths: ['M6 35L18 27L15 39L25 45', 'M58 35L46 27L49 39L39 45', 'M19 51H45'],
  },
}

export const BADGE_ART_IDS = Object.freeze(Object.keys(BADGE_ART))

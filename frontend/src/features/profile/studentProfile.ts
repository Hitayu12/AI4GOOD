import type { SchoolAffiliation } from '../../api/types';

const profileKey = 'futureworth-profile-v1';

export const regions = [
  ['AL','Alabama'], ['AK','Alaska'], ['AZ','Arizona'], ['AR','Arkansas'], ['CA','California'],
  ['CO','Colorado'], ['CT','Connecticut'], ['DE','Delaware'], ['DC','District of Columbia'],
  ['FL','Florida'], ['GA','Georgia'], ['HI','Hawaii'], ['ID','Idaho'], ['IL','Illinois'],
  ['IN','Indiana'], ['IA','Iowa'], ['KS','Kansas'], ['KY','Kentucky'], ['LA','Louisiana'],
  ['ME','Maine'], ['MD','Maryland'], ['MA','Massachusetts'], ['MI','Michigan'], ['MN','Minnesota'],
  ['MS','Mississippi'], ['MO','Missouri'], ['MT','Montana'], ['NE','Nebraska'], ['NV','Nevada'],
  ['NH','New Hampshire'], ['NJ','New Jersey'], ['NM','New Mexico'], ['NY','New York'],
  ['NC','North Carolina'], ['ND','North Dakota'], ['OH','Ohio'], ['OK','Oklahoma'], ['OR','Oregon'],
  ['PA','Pennsylvania'], ['RI','Rhode Island'], ['SC','South Carolina'], ['SD','South Dakota'],
  ['TN','Tennessee'], ['TX','Texas'], ['UT','Utah'], ['VT','Vermont'], ['VA','Virginia'],
  ['WA','Washington'], ['WV','West Virginia'], ['WI','Wisconsin'], ['WY','Wyoming'],
  ['AS','American Samoa'], ['GU','Guam'], ['MP','Northern Mariana Islands'], ['PR','Puerto Rico'],
  ['VI','U.S. Virgin Islands'], ['INTL','Outside the United States'],
] as const;

export const schools = [
  { id: 'rutgers', name: 'Rutgers University', scores: [1400, 650, 210] },
  { id: 'njit', name: 'New Jersey Institute of Technology', scores: [1240, 810, 170] },
  { id: 'montclair', name: 'Montclair State University', scores: [1100, 780, 450] },
  { id: 'princeton', name: 'Princeton University', scores: [1550, 470, 190] },
  { id: 'northside', name: 'Northside High (fictional)', scores: [940, 510, 360] },
];

export const avatars = [
  { id: 'star', glyph: '✦', color: 'lavender', label: 'Star' },
  { id: 'orbit', glyph: '◉', color: 'mint', label: 'Orbit' },
  { id: 'sun', glyph: '☀', color: 'peach', label: 'Sun' },
  { id: 'diamond', glyph: '◈', color: 'lavender', label: 'Diamond' },
] as const;

export const goals = [
  { id: 'payday', label: 'Make my paycheck last' },
  { id: 'surprise', label: 'Build an emergency fund' },
  { id: 'time', label: 'Understand how money grows' },
  { id: 'mix', label: 'Learn to invest' },
] as const;

export type StudentProfile = {
  nickname: string;
  school: string;
  customSchool: string;
  stateCode: string;
  avatar: (typeof avatars)[number]['id'];
  goal: (typeof goals)[number]['id'] | '';
};

const defaults: StudentProfile = { nickname: '', school: '', customSchool: '', stateCode: '', avatar: 'star', goal: '' };
export type AffiliationFields = Pick<StudentProfile, 'school' | 'customSchool' | 'stateCode'>;
export const emptyAffiliation: AffiliationFields = { school: '', customSchool: '', stateCode: '' };

function normalize(value: Partial<StudentProfile>): StudentProfile {
  return {
    nickname: typeof value.nickname === 'string' ? value.nickname.trim().slice(0, 24) : '',
    school: value.school === 'other' || schools.some(({ id }) => id === value.school) ? value.school ?? '' : '',
    customSchool: typeof value.customSchool === 'string' ? value.customSchool.trim().slice(0, 70) : '',
    stateCode: regions.find(([code]) => code === value.stateCode)?.[0] ?? '',
    avatar: avatars.find(({ id }) => id === value.avatar)?.id ?? 'star',
    goal: goals.find(({ id }) => id === value.goal)?.id ?? '',
  };
}

function keyForAccount(accountId?: string) {
  return accountId ? `${profileKey}:${accountId}` : profileKey;
}

export function loadProfile(accountId?: string): StudentProfile {
  try { return normalize(JSON.parse(localStorage.getItem(keyForAccount(accountId)) ?? '{}') ?? {}); }
  catch { return defaults; }
}

export function saveProfile(profile: StudentProfile, accountId?: string): StudentProfile {
  const normalized = normalize(profile);
  try { localStorage.setItem(keyForAccount(accountId), JSON.stringify(normalized)); }
  catch { /* Profile stays available in the current session. */ }
  return normalized;
}

export function schoolName(profile: AffiliationFields) {
  return profile.school === 'other' ? profile.customSchool : schools.find(({ id }) => id === profile.school)?.name ?? '';
}

export function toAffiliation(profile: AffiliationFields): SchoolAffiliation {
  return { school_name: schoolName(profile).trim() || null, state_code: profile.stateCode || null };
}

export function withAffiliation(profile: StudentProfile, affiliation: SchoolAffiliation): StudentProfile {
  const known = schools.find(({ name }) => name === affiliation.school_name);
  return normalize({
    ...profile,
    school: known?.id ?? (affiliation.school_name ? 'other' : ''),
    customSchool: known ? '' : affiliation.school_name ?? '',
    stateCode: affiliation.state_code ?? '',
  });
}

export function profileAvatar(profile: StudentProfile) {
  return avatars.find(({ id }) => id === profile.avatar) ?? avatars[0];
}

type Entry = { id: string; name: string; points: number; current?: boolean };

function rank(entries: Entry[]) {
  const sorted = [...entries].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  return sorted.map((entry, index) => ({
    ...entry,
    rank: index > 0 && entry.points === sorted[index - 1].points
      ? sorted.findIndex(({ points }) => points === entry.points) + 1
      : index + 1,
  }));
}

export type BoardScope = 'all' | 'my-school' | 'schools';
export type RankedEntry = ReturnType<typeof rank>[number];

const demoAliases = ['PocketPlanner', 'BudgetBuddy', 'FutureLedger'];

export function getStandings(scope: BoardScope, profile: StudentProfile, points: number): RankedEntry[] {
  if (scope === 'schools') {
    const populations: Entry[] = schools.map(({ id, name, scores }) => ({
      id,
      name,
      current: id === profile.school,
      points: scores.reduce((sum, score) => sum + score, id === profile.school ? points : 0),
    }));
    if (profile.school === 'other' && profile.customSchool) populations.push({ id: 'other', name: profile.customSchool, points, current: true });
    return rank(populations);
  }
  if (scope === 'my-school' && !schoolName(profile)) return [];
  const roster = scope === 'all' ? schools : schools.filter(({ id }) => id === profile.school);
  return rank([
    ...roster.flatMap(({ id, scores }, schoolIndex) => scores.map((score, index) => ({
      id: `${id}-${index}`,
      name: scope === 'all' ? `${demoAliases[index]}${schoolIndex + 1}` : demoAliases[index],
      points: score,
    }))),
    { id: 'you', name: profile.nickname || 'You', points, current: true },
  ]);
}

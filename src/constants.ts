import { Group } from './types';

export const SUBJECTS_BY_GROUP: Record<Group | 'Common', string[]> = {
  Common: [
    'Bangla',
    'English',
    'Math',
    'ICT',
    'Islam'
  ],
  Science: [
    'Physics',
    'Chemistry',
    'Biology',
    'Higher Math',
    'BGS'
  ],
  Commerce: [
    'Accounting',
    'Finance & Banking',
    'Business Entrepreneurship',
    'General Science'
  ],
  Arts: [
    'History of Bangladesh and World Civilization',
    'Geography and Environment',
    'Civics and Citizenship',
    'Economics',
    'General Science'
  ]
};

export const ALL_SUBJECTS = Array.from(new Set([
  ...SUBJECTS_BY_GROUP.Common,
  ...SUBJECTS_BY_GROUP.Science,
  ...SUBJECTS_BY_GROUP.Commerce,
  ...SUBJECTS_BY_GROUP.Arts
]));

export const getSubjectsForGroup = (group?: Group) => {
  if (!group) return SUBJECTS_BY_GROUP.Common;
  return Array.from(new Set([...SUBJECTS_BY_GROUP.Common, ...SUBJECTS_BY_GROUP[group]]));
};

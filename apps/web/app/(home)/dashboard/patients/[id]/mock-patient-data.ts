import { Patient } from '../../../../../services/api-service';

export interface Demographics {
  age: number | null;
  gender: string;
  bloodType: string;
  phone: string | null;
  email: string | null;
  address: {
    line: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  primaryPhysician: string;
}

export interface MedicalHistory {
  conditions: Array<{
    name: string;
    status: string;
    onsetDate?: string;
  }>;
  allergies: Array<{
    name: string;
    severity: string;
    onsetDate?: string;
  }>;
  lastUpdated: string;
}

function hashString(value: string): number {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PHYSICIANS = [
  'Dr. Donato Schaefer',
  'Dr. Sarah Johnson',
  'Dr. Priya Patel',
  'Dr. Marcus Chen',
];
const CONDITION_SETS = [
  [
    {
      name: 'Type 2 Diabetes Mellitus',
      status: 'active',
      onsetDate: '2019-03-14T00:00:00Z',
    },
    {
      name: 'Hypertension',
      status: 'active',
      onsetDate: '2020-07-21T00:00:00Z',
    },
  ],
  [
    {
      name: 'Asthma',
      status: 'active',
      onsetDate: '2016-11-02T00:00:00Z',
    },
  ],
  [
    {
      name: 'Hyperlipidemia',
      status: 'active',
      onsetDate: '2021-01-10T00:00:00Z',
    },
    {
      name: 'Hypothyroidism',
      status: 'active',
      onsetDate: '2018-04-19T00:00:00Z',
    },
  ],
];
const ALLERGY_SETS = [
  [
    {
      name: 'Penicillin',
      severity: 'severe',
      onsetDate: '2015-05-12T00:00:00Z',
    },
  ],
  [
    {
      name: 'Shellfish',
      severity: 'moderate',
      onsetDate: '2018-09-03T00:00:00Z',
    },
    {
      name: 'Peanuts',
      severity: 'severe',
      onsetDate: '2012-02-08T00:00:00Z',
    },
  ],
  [],
];

export function getMockDemographics(patient: Patient): Demographics {
  const seed = hashString(patient.id || patient.medicalRecordNumber);

  return {
    age: 24 + (seed % 52),
    gender: seed % 2 === 0 ? 'male' : 'female',
    bloodType: BLOOD_TYPES[seed % BLOOD_TYPES.length] ?? 'O+',
    phone: null,
    email: null,
    address: null,
    primaryPhysician: PHYSICIANS[seed % PHYSICIANS.length] ?? 'Dr. Unknown',
  };
}

export function getMockMedicalHistory(patient: Patient): MedicalHistory {
  const seed = hashString(patient.id || patient.medicalRecordNumber);

  return {
    conditions: CONDITION_SETS[seed % CONDITION_SETS.length] ?? [],
    allergies: ALLERGY_SETS[seed % ALLERGY_SETS.length] ?? [],
    lastUpdated: patient.updatedAt || new Date().toISOString(),
  };
}

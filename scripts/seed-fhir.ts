#!/usr/bin/env node

import axios from 'axios';
import { faker } from '@faker-js/faker';
import { Client } from 'pg';

// Using FHIR R4 types from @types/fhir
type Patient = fhir4.Patient;
type Observation = fhir4.Observation;
type Condition = fhir4.Condition;
type MedicationRequest = fhir4.MedicationRequest;
type AllergyIntolerance = fhir4.AllergyIntolerance;
type Practitioner = fhir4.Practitioner;
type Appointment = fhir4.Appointment;
type CareTeam = fhir4.CareTeam;
type Bundle = fhir4.Bundle;
type Resource = fhir4.Resource;

const FHIR_SERVER_URL = 'http://localhost:3002/fhir';
const NUM_PATIENTS = 20;

// Database configuration
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'coding_exercise_db',
  user: 'devuser',
  password: 'devpassword',
};

function generateFhirId(prefix: string): string {
  return `${prefix}-${faker.string.alphanumeric(12)}`;
}

function generatePatient(tempId: string): Patient {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const gender = faker.helpers.arrayElement(['male', 'female'] as const);
  const birthDate = faker.date.birthdate({ min: 18, max: 80, mode: 'age' });

  return {
    resourceType: 'Patient',
    identifier: [
      {
        system: 'http://hospital.smarthealth.org/patient-id',
        value: `MRN${faker.string.numeric(6)}`,
      },
    ],
    name: [
      {
        use: 'official',
        family: lastName,
        given: [firstName],
      },
    ],
    telecom: [
      {
        system: 'phone',
        value: faker.phone.number(),
        use: 'home',
      },
      {
        system: 'email',
        value: faker.internet.email({ firstName, lastName }).toLowerCase(),
      },
    ],
    gender: gender,
    birthDate: birthDate.toISOString().split('T')[0],
    address: [
      {
        use: 'home',
        line: [faker.location.streetAddress()],
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        postalCode: faker.location.zipCode(),
        country: 'US',
      },
    ],
    active: true,
  };
}

function generateObservation(patientTempId: string): Observation {
  const observationTemplates = [
    {
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8310-5',
            display: 'Body temperature',
          },
        ],
      },
      valueQuantity: {
        unit: 'Cel',
        system: 'http://unitsofmeasure.org',
        code: 'Cel',
      },
      valueGenerator: () =>
        faker.number.float({ min: 36.0, max: 39.0, fractionDigits: 1 }),
    },
    {
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8867-4',
            display: 'Heart rate',
          },
        ],
      },
      valueQuantity: {
        unit: '/min',
        system: 'http://unitsofmeasure.org',
        code: '/min',
      },
      valueGenerator: () => faker.number.int({ min: 60, max: 100 }),
    },
    {
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8480-6',
            display: 'Systolic blood pressure',
          },
        ],
      },
      valueQuantity: {
        unit: 'mm[Hg]',
        system: 'http://unitsofmeasure.org',
        code: 'mm[Hg]',
      },
      valueGenerator: () => faker.number.int({ min: 110, max: 140 }),
    },
    {
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8462-4',
            display: 'Diastolic blood pressure',
          },
        ],
      },
      valueQuantity: {
        unit: 'mm[Hg]',
        system: 'http://unitsofmeasure.org',
        code: 'mm[Hg]',
      },
      valueGenerator: () => faker.number.int({ min: 70, max: 90 }),
    },
    {
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '2708-6',
            display: 'Oxygen saturation',
          },
        ],
      },
      valueQuantity: {
        unit: '%',
        system: 'http://unitsofmeasure.org',
        code: '%',
      },
      valueGenerator: () => faker.number.int({ min: 95, max: 100 }),
    },
  ];

  const template = faker.helpers.arrayElement(observationTemplates);

  return {
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ],
    code: template.code,
    subject: {
      reference: patientTempId,
    },
    effectiveDateTime: faker.date.recent({ days: 7 }).toISOString(),
    valueQuantity: {
      ...template.valueQuantity,
      value: template.valueGenerator(),
    },
  };
}

function generateBloodTypeObservation(patientTempId: string): Observation {
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const bloodType = faker.helpers.arrayElement(bloodTypes);

  return {
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '883-9',
          display: 'ABO group [Type] in Blood',
        },
      ],
    },
    subject: {
      reference: patientTempId,
    },
    effectiveDateTime: faker.date.past({ years: 1 }).toISOString(),
    valueCodeableConcept: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: '112144000', // This would vary by blood type in real implementation
          display: bloodType,
        },
      ],
      text: bloodType,
    },
  };
}

function generateAllergyIntolerance(patientTempId: string): AllergyIntolerance {
  const allergies = [
    { code: '387517004', display: 'Penicillin', severity: 'severe' },
    { code: '102263004', display: 'Eggs', severity: 'moderate' },
    { code: '227493005', display: 'Shellfish', severity: 'severe' },
    { code: '396458002', display: 'Sulfonamides', severity: 'moderate' },
    { code: '111088007', display: 'Latex', severity: 'mild' },
    { code: '409137002', display: 'Peanuts', severity: 'severe' },
  ];

  const allergy = faker.helpers.arrayElement(allergies);

  return {
    resourceType: 'AllergyIntolerance',
    clinicalStatus: {
      coding: [
        {
          system:
            'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
          code: 'active',
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system:
            'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
          code: 'confirmed',
        },
      ],
    },
    code: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: allergy.code,
          display: allergy.display,
        },
      ],
    },
    patient: {
      reference: patientTempId,
    },
    onsetDateTime: faker.date.past({ years: 5 }).toISOString(),
    reaction: [
      {
        severity: allergy.severity as 'mild' | 'moderate' | 'severe',
        manifestation: [
          {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '271807003',
                display: 'Rash',
              },
            ],
          },
        ],
      },
    ],
  };
}

function generatePractitioner(): Practitioner {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const specialties = [
    'Internal Medicine',
    'Family Medicine',
    'Cardiology',
    'Endocrinology',
    'Pulmonology',
    'Nephrology',
  ];

  return {
    resourceType: 'Practitioner',
    identifier: [
      {
        system: 'http://hl7.org/fhir/sid/us-npi',
        value: faker.string.numeric(10),
      },
    ],
    name: [
      {
        use: 'official',
        prefix: ['Dr.'],
        given: [firstName],
        family: lastName,
      },
    ],
    telecom: [
      {
        system: 'phone',
        value: faker.phone.number(),
        use: 'work',
      },
    ],
    qualification: [
      {
        code: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
              code: 'MD',
              display: 'Doctor of Medicine',
            },
          ],
        },
      },
    ],
    // Add specialty as extension or in a specialty field if available
    extension: [
      {
        url: 'http://hl7.org/fhir/StructureDefinition/practitioner-specialty',
        valueString: faker.helpers.arrayElement(specialties),
      },
    ],
  };
}

function generateAppointment(
  patientTempId: string,
  practitionerTempId: string
): Appointment {
  const appointmentTypes = [
    'Annual Physical',
    'Follow-up Visit',
    'Consultation',
    'Lab Review',
    'Medication Management',
    'Preventive Care',
  ];

  const futureDate = faker.date.future({ years: 0.25 }); // ~3 months
  const appointmentDuration = faker.number.int({ min: 15, max: 60 }); // minutes

  return {
    resourceType: 'Appointment',
    status: 'booked',
    serviceType: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/service-type',
            code: '124',
            display: 'General Practice',
          },
        ],
      },
    ],
    appointmentType: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: 'ROUTINE',
          display: faker.helpers.arrayElement(appointmentTypes),
        },
      ],
    },
    description: faker.helpers.arrayElement(appointmentTypes),
    start: futureDate.toISOString(),
    end: new Date(
      futureDate.getTime() + appointmentDuration * 60000
    ).toISOString(),
    participant: [
      {
        actor: {
          reference: patientTempId,
        },
        status: 'accepted',
      },
      {
        actor: {
          reference: practitionerTempId,
        },
        status: 'accepted',
      },
    ],
  };
}

function generatePrimaryCareAppointment(
  patientTempId: string,
  practitionerTempId: string
): Appointment {
  const primaryCareTypes = [
    'Annual Physical',
    'Wellness Check',
    'Primary Care Visit',
    'Routine Checkup',
    'Health Maintenance',
  ];

  // Generate a past appointment (within last 6 months) to establish care relationship
  const pastDate = faker.date.recent({ days: 180 }); // last 6 months
  const appointmentDuration = faker.number.int({ min: 30, max: 60 }); // longer for primary care

  return {
    resourceType: 'Appointment',
    status: 'fulfilled', // Past appointment that was completed
    serviceType: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/service-type',
            code: '124',
            display: 'General Practice',
          },
        ],
      },
    ],
    appointmentType: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: 'ROUTINE',
          display: faker.helpers.arrayElement(primaryCareTypes),
        },
      ],
    },
    description: faker.helpers.arrayElement(primaryCareTypes),
    start: pastDate.toISOString(),
    end: new Date(
      pastDate.getTime() + appointmentDuration * 60000
    ).toISOString(),
    participant: [
      {
        actor: {
          reference: patientTempId,
        },
        status: 'accepted',
      },
      {
        actor: {
          reference: practitionerTempId,
        },
        status: 'accepted',
      },
    ],
  };
}

function generateCareTeam(
  patientTempId: string,
  primaryCarePractitioner: string
): CareTeam {
  return {
    resourceType: 'CareTeam',
    status: 'active',
    subject: {
      reference: patientTempId,
    },
    participant: [
      {
        role: [
          {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '446050000',
                display: 'Primary care physician',
              },
            ],
          },
        ],
        member: {
          reference: primaryCarePractitioner,
        },
      },
    ],
    period: {
      start: faker.date.past({ years: 1 }).toISOString(),
    },
  };
}

interface ConditionType {
  code: string;
  display: string;
  system: string;
}

function generateCondition(patientTempId: string): Condition {
  const conditions: ConditionType[] = [
    {
      code: 'E11',
      display: 'Type 2 diabetes mellitus',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'I10',
      display: 'Essential hypertension',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'J45',
      display: 'Asthma',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'M79.3',
      display: 'Panniculitis, unspecified',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'K21',
      display: 'Gastro-esophageal reflux disease',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'E78.5',
      display: 'Hyperlipidemia, unspecified',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'M25.511',
      display: 'Pain in right shoulder',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'F32.9',
      display: 'Major depressive disorder, single episode, unspecified',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'G43.909',
      display:
        'Migraine, unspecified, not intractable, without status migrainosus',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'M54.5',
      display: 'Low back pain',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'I25.10',
      display:
        'Atherosclerotic heart disease of native coronary artery without angina pectoris',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'N18.6',
      display: 'End stage renal disease',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'K59.00',
      display: 'Constipation, unspecified',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'H35.9',
      display: 'Unspecified retinal disorder',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'J44.1',
      display: 'Chronic obstructive pulmonary disease with acute exacerbation',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'L40.9',
      display: 'Psoriasis, unspecified',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'F41.9',
      display: 'Anxiety disorder, unspecified',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
    {
      code: 'E03.9',
      display: 'Hypothyroidism, unspecified',
      system: 'http://hl7.org/fhir/sid/icd-10',
    },
  ];

  const condition = faker.helpers.arrayElement(conditions);

  return {
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
        },
      ],
    },
    code: {
      coding: [condition],
    },
    subject: {
      reference: patientTempId,
    },
    onsetDateTime: faker.date.past({ years: 2 }).toISOString(),
  };
}

interface MedicationType {
  code: string;
  display: string;
  system: string;
}

function generateMedicationRequest(patientTempId: string): MedicationRequest {
  const medications: MedicationType[] = [
    {
      code: '860975',
      display: 'Metformin 1000 MG Oral Tablet',
      system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
    },
    {
      code: '314076',
      display: 'Lisinopril 10 MG Oral Tablet',
      system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
    },
    {
      code: '1998',
      display: 'Albuterol 0.09 MG/ML Inhalation Solution',
      system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
    },
    {
      code: '617314',
      display: 'Atorvastatin 20 MG Oral Tablet',
      system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
    },
  ];

  const medication = faker.helpers.arrayElement(medications);

  return {
    resourceType: 'MedicationRequest',
    status: 'active',
    intent: 'order',
    medicationCodeableConcept: {
      coding: [medication],
    },
    subject: {
      reference: patientTempId,
    },
    authoredOn: faker.date.past({ years: 1 }).toISOString(),
    dosageInstruction: [
      {
        text: faker.helpers.arrayElement([
          'Take once daily',
          'Take twice daily',
          'Take as needed',
          'Take with meals',
        ]),
        timing: {
          repeat: {
            frequency: faker.helpers.arrayElement([1, 2]),
            period: 1,
            periodUnit: 'd',
          },
        },
      },
    ],
  };
}

async function getFhirIdByMrn(mrn: string): Promise<string | null> {
  try {
    const response = await axios.get(
      `${FHIR_SERVER_URL}/Patient?identifier=${mrn}`,
      {
        headers: { Accept: 'application/fhir+json' },
        timeout: 10000,
      }
    );

    if (response.data?.entry?.length > 0) {
      return response.data.entry[0].resource.id;
    }
  } catch (error) {
    console.error(`Error fetching FHIR ID for MRN ${mrn}:`, error);
  }
  return null;
}

async function createLocalPatient(
  client: Client,
  patient: Patient,
  fhirId: string
): Promise<void> {
  const mrn = patient.identifier?.[0]?.value || `MRN${faker.string.numeric(6)}`;
  const firstName = patient.name?.[0]?.given?.[0] || 'Unknown';
  const lastName = patient.name?.[0]?.family || 'Unknown';

  const query = `
    INSERT INTO patients (
      "firstName", 
      "lastName", 
      "medicalRecordNumber", 
      "fhirId", 
      "createdAt", 
      "updatedAt"
    ) VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT ("medicalRecordNumber") DO NOTHING
  `;

  try {
    await client.query(query, [firstName, lastName, mrn, fhirId]);
    console.log(
      `✅ Created local patient: ${firstName} ${lastName} (MRN: ${mrn}, FHIR ID: ${fhirId})`
    );
  } catch (error) {
    console.error(
      `❌ Failed to create local patient ${firstName} ${lastName}:`,
      error
    );
  }
}

async function uploadBundle(
  entries: Array<Resource & { fullUrl?: string }>
): Promise<{ success: boolean; response?: any }> {
  const bundle: Bundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: entries.map((resource) => {
      const { fullUrl, ...cleanResource } = resource;
      return {
        fullUrl: fullUrl,
        resource: cleanResource as fhir4.FhirResource,
        request: {
          method: 'POST',
          url: cleanResource.resourceType,
        },
      };
    }),
  };

  try {
    console.log(`📤 Uploading bundle with ${entries.length} resources...`);
    const response = await axios.post(FHIR_SERVER_URL, bundle, {
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
      timeout: 30000,
    });

    console.log(
      `✅ Uploaded ${entries.length} FHIR resources (status: ${response.status})`
    );
    return { success: true, response: response.data };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error(
        "❌ Cannot connect to FHIR server. Make sure it's running on http://localhost:3002"
      );
      return { success: false };
    } else {
      console.log(
        `⚠️  Upload attempted for ${entries.length} resources - continuing anyway`
      );
      return { success: true }; // Continue regardless of validation errors
    }
  }
}

async function seedFhirData(): Promise<void> {
  console.log('🏥 FHIR Data Seeding & Local Database');
  console.log(`   FHIR Server: ${FHIR_SERVER_URL}`);
  console.log(
    `   Database: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`
  );
  console.log(`   Patients to create: ${NUM_PATIENTS}`);
  console.log('');

  // Test FHIR server connection first
  try {
    console.log('🔍 Testing FHIR server connection...');
    await axios.get(`${FHIR_SERVER_URL}/metadata`, { timeout: 5000 });
    console.log('✅ FHIR server is accessible');
  } catch (error) {
    console.error(
      "❌ Cannot connect to FHIR server. Please ensure it's running:"
    );
    console.error('   docker-compose up -d hapi-fhir');
    console.error('   Wait a minute for startup, then try again');
    process.exit(1);
  }

  // Connect to local database
  const client = new Client(DB_CONFIG);
  try {
    console.log('🔍 Connecting to local database...');
    await client.connect();
    console.log('✅ Database connection established');

    const tables = await client.query<{ exists: boolean }>(
      `SELECT to_regclass('public.patients') IS NOT NULL AS exists`
    );
    if (!tables.rows[0]?.exists) {
      console.error('❌ The patients table does not exist yet.');
      console.error(
        '   Start the apps first so Nest can sync the schema: pnpm run dev'
      );
      await client.end();
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Cannot connect to database:', error);
    console.error(
      '   Make sure PostgreSQL is running: docker-compose up -d postgres'
    );
    process.exit(1);
  }

  const allResources: Array<Resource & { fullUrl?: string }> = [];
  const localPatients: Array<{ patient: Patient }> = [];

  // Generate practitioners first (they'll be referenced by appointments)
  const practitioners: string[] = [];
  const numPractitioners = Math.max(3, Math.floor(NUM_PATIENTS / 5)); // At least 3, or 1 per 5 patients
  for (let i = 0; i < numPractitioners; i++) {
    const practitionerTempId = `urn:uuid:practitioner-${i}`;
    const practitioner = generatePractitioner();
    allResources.push({
      ...practitioner,
      fullUrl: practitionerTempId,
    });
    practitioners.push(practitionerTempId);
  }

  // Generate patients and their associated data with temporary references
  for (let i = 0; i < NUM_PATIENTS; i++) {
    const patientTempId = `urn:uuid:patient-${i}`;
    const patient = generatePatient(patientTempId);

    allResources.push({
      ...patient,
      fullUrl: patientTempId,
    });

    // Store for local database creation
    localPatients.push({ patient });

    // Assign a primary care physician (ensure every patient has one)
    const primaryCarePractitioner = faker.helpers.arrayElement(practitioners);

    // Generate vital signs observations (2-4 per patient)
    const numObs = faker.number.int({ min: 2, max: 4 });
    for (let j = 0; j < numObs; j++) {
      allResources.push(generateObservation(patientTempId));
    }

    // Always generate blood type observation
    allResources.push(generateBloodTypeObservation(patientTempId));

    // 80% chance of having conditions (1-4 conditions per patient)
    if (faker.datatype.boolean(0.8)) {
      const numConditions = faker.number.int({ min: 1, max: 4 });
      const usedConditions = new Set(); // Track used conditions to avoid duplicates

      for (let c = 0; c < numConditions; c++) {
        let condition;
        let attempts = 0;

        // Generate unique conditions (avoid duplicates for same patient)
        do {
          condition = generateCondition(patientTempId);
          attempts++;
        } while (
          usedConditions.has(condition.code?.coding?.[0]?.code) &&
          attempts < 10
        );

        if (!usedConditions.has(condition.code?.coding?.[0]?.code)) {
          usedConditions.add(condition.code?.coding?.[0]?.code);
          allResources.push(condition);
        }
      }
    }

    // 60% chance of having a medication
    if (faker.datatype.boolean(0.6)) {
      allResources.push(generateMedicationRequest(patientTempId));
    }

    // 40% chance of having allergies (1-2 allergies)
    if (faker.datatype.boolean(0.4)) {
      const numAllergies = faker.number.int({ min: 1, max: 2 });
      for (let k = 0; k < numAllergies; k++) {
        allResources.push(generateAllergyIntolerance(patientTempId));
      }
    }

    // ALWAYS create at least one appointment with primary care physician (recent past visit)
    allResources.push(
      generatePrimaryCareAppointment(patientTempId, primaryCarePractitioner)
    );

    // ALWAYS create a CareTeam resource to establish the care relationship
    allResources.push(generateCareTeam(patientTempId, primaryCarePractitioner));

    // 70% chance of having an additional future appointment (may be with same or different practitioner)
    if (faker.datatype.boolean(0.7)) {
      const randomPractitioner = faker.helpers.arrayElement(practitioners);
      allResources.push(generateAppointment(patientTempId, randomPractitioner));
    }
  }

  console.log(`📋 Generated ${allResources.length} total FHIR resources:`);
  console.log(
    `   - ${allResources.filter((r) => r.resourceType === 'Patient').length} Patients`
  );
  console.log(
    `   - ${allResources.filter((r) => r.resourceType === 'Practitioner').length} Practitioners`
  );
  console.log(
    `   - ${allResources.filter((r) => r.resourceType === 'Observation').length} Observations`
  );
  console.log(
    `   - ${allResources.filter((r) => r.resourceType === 'Condition').length} Conditions`
  );
  console.log(
    `   - ${allResources.filter((r) => r.resourceType === 'MedicationRequest').length} Medications`
  );
  console.log(
    `   - ${allResources.filter((r) => r.resourceType === 'AllergyIntolerance').length} Allergies`
  );
  console.log(
    `   - ${allResources.filter((r) => r.resourceType === 'Appointment').length} Appointments`
  );
  console.log(
    `   - ${allResources.filter((r) => r.resourceType === 'CareTeam').length} Care Teams`
  );
  console.log('');

  // Upload all resources in a single transaction with proper references
  const uploadResult = await uploadBundle(allResources);
  if (!uploadResult.success) {
    console.error('❌ FHIR upload failed, stopping');
    await client.end();
    process.exit(1);
  }

  console.log('');
  console.log('💾 Creating patients in local database with actual FHIR IDs...');

  // Create patients in local database with actual FHIR IDs
  for (const { patient } of localPatients) {
    const mrn = patient.identifier?.[0]?.value;
    if (mrn) {
      // Get the actual FHIR ID from the server
      const actualFhirId = await getFhirIdByMrn(mrn);
      if (actualFhirId) {
        await createLocalPatient(client, patient, actualFhirId);
      } else {
        console.error(`❌ Could not find FHIR ID for patient with MRN: ${mrn}`);
      }
    }
  }

  // Close database connection
  await client.end();
  console.log('✅ Database connection closed');

  console.log('');
  console.log('🎉 FHIR & Local Database seeding completed!');
  console.log('');
  console.log('📖 Query examples:');
  console.log(`   curl "${FHIR_SERVER_URL}/Patient"`);
  console.log(`   curl "${FHIR_SERVER_URL}/Practitioner"`);
  console.log(`   curl "${FHIR_SERVER_URL}/Observation"`);
  console.log(`   curl "${FHIR_SERVER_URL}/Condition"`);
  console.log(`   curl "${FHIR_SERVER_URL}/MedicationRequest"`);
  console.log(`   curl "${FHIR_SERVER_URL}/AllergyIntolerance"`);
  console.log(`   curl "${FHIR_SERVER_URL}/Appointment"`);
  console.log(`   curl "${FHIR_SERVER_URL}/CareTeam"`);
  console.log('');
  console.log(
    '🏥 Local patients created — list them at http://localhost:4000/patients after signing in'
  );
}

// Run the seeding
seedFhirData().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});

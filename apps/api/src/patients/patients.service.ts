import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patient.entity';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
  ) { }

  async findAll(): Promise<Patient[]> {
    return await this.patientsRepository.find({
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Patient> {
    const patient = await this.patientsRepository.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }

  async searchPatients(query: string): Promise<Patient[]> {
    return await this.patientsRepository
      .createQueryBuilder('patient')
      .where('patient.firstName ILIKE :query', { query: `%${query}%` })
      .orWhere('patient.lastName ILIKE :query', { query: `%${query}%` })
      .orWhere('patient.medicalRecordNumber ILIKE :query', {
        query: `%${query}%`,
      })
      .orderBy('patient.lastName', 'ASC')
      .addOrderBy('patient.firstName', 'ASC')
      .getMany();
  }

  private async fetchFhirResources(url: string): Promise<any[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`FHIR request failed: ${response.status}`);
      }
      const bundle = await response.json();
      return bundle.entry
        ? bundle.entry.map((entry: any) => entry.resource)
        : [];
    } catch (error) {
      console.error(`Error fetching FHIR data from ${url}:`, error);
      return [];
    }
  }

  // Get patient demographics from FHIR server
  async getDemographics(patientId: string): Promise<any> {
    const patient = await this.findOne(patientId);
    const fhirBaseUrl =
      process.env.FHIR_SERVER_URL || 'http://localhost:3002/fhir';

    try {
      // Fetch patient data from FHIR server
      const fhirPatientResponse = await fetch(
        `${fhirBaseUrl}/Patient/${patient.fhirId}`,
      );
      const fhirPatient = fhirPatientResponse.ok
        ? await fhirPatientResponse.json()
        : null;
      const [observations, appointments, careTeams] = await Promise.all([
        this.fetchFhirResources(
          `${fhirBaseUrl}/Observation?subject=${patient.fhirId}`,
        ),
        this.fetchFhirResources(
          `${fhirBaseUrl}/Appointment?actor=${patient.fhirId}`,
        ),
        this.fetchFhirResources(
          `${fhirBaseUrl}/CareTeam?subject=${patient.fhirId}`,
        ),
      ]);

      // Find blood type
      const bloodTypeObs = observations.find((obs) =>
        obs.code?.coding?.some((code: any) => code.code === '883-9'),
      );

      // Calculate age from birth date
      const birthDate = fhirPatient?.birthDate;
      const age = birthDate ? this.calculateAge(birthDate) : null;

      // Try to get primary care physician from CareTeam first, then appointments
      let primaryPhysician = 'Dr. Unknown';

      // First, check if there's a CareTeam with a primary care physician
      if (careTeams.length > 0) {
        const activeCareTeam = careTeams.find(
          (team) => team.status === 'active',
        );
        if (activeCareTeam) {
          const primaryCareParticipant = activeCareTeam.participant?.find(
            (p: any) =>
              p.role?.[0]?.coding?.some(
                (code: any) => code.code === '446050000',
              ), // Primary care physician code
          );

          if (primaryCareParticipant?.member?.reference) {
            try {
              const practitionerId =
                primaryCareParticipant.member.reference.split('/')[1];
              const practitionerResponse = await fetch(
                `${fhirBaseUrl}/Practitioner/${practitionerId}`,
              );
              if (practitionerResponse.ok) {
                const practitioner = await practitionerResponse.json();
                const name = practitioner.name?.[0];
                if (name) {
                  const prefix = name.prefix?.[0] || 'Dr.';
                  const firstName = name.given?.[0] || '';
                  const lastName = name.family || '';
                  primaryPhysician =
                    `${prefix} ${firstName} ${lastName}`.trim();
                }
              }
            } catch (error) {
              console.error(
                'Error fetching practitioner from CareTeam:',
                error,
              );
            }
          }
        }
      }

      // Fallback to appointments if no CareTeam found
      if (primaryPhysician === 'Dr. Unknown' && appointments.length > 0) {
        // Get the most recent appointment's practitioner
        const recentAppointment = appointments.reduce((latest, current) =>
          new Date(current.start || 0) > new Date(latest.start || 0)
            ? current
            : latest,
        );

        // Try to fetch practitioner details if we have a reference
        if (recentAppointment.participant?.length > 0) {
          const practitionerRef = recentAppointment.participant.find((p: any) =>
            p.actor?.reference?.startsWith('Practitioner/'),
          );

          if (practitionerRef) {
            try {
              const practitionerId =
                practitionerRef.actor.reference.split('/')[1];
              const practitionerResponse = await fetch(
                `${fhirBaseUrl}/Practitioner/${practitionerId}`,
              );
              if (practitionerResponse.ok) {
                const practitioner = await practitionerResponse.json();
                const name = practitioner.name?.[0];
                if (name) {
                  const prefix = name.prefix?.[0] || 'Dr.';
                  const firstName = name.given?.[0] || '';
                  const lastName = name.family || '';
                  primaryPhysician =
                    `${prefix} ${firstName} ${lastName}`.trim();
                }
              }
            } catch (error) {
              console.error(
                'Error fetching practitioner from appointment:',
                error,
              );
            }
          }
        }
      }

      return {
        age,
        gender: fhirPatient?.gender,
        bloodType: bloodTypeObs?.valueCodeableConcept?.text || 'Unknown',
        phone: fhirPatient?.telecom?.find((t: any) => t.system === 'phone')
          ?.value,
        email: fhirPatient?.telecom?.find((t: any) => t.system === 'email')
          ?.value,
        address: fhirPatient?.address?.[0]
          ? {
            line: fhirPatient.address[0].line?.[0],
            city: fhirPatient.address[0].city,
            state: fhirPatient.address[0].state,
            postalCode: fhirPatient.address[0].postalCode,
          }
          : null,
        primaryPhysician,
      };
    } catch (error) {
      console.error('Error fetching FHIR demographics:', error);
      // Return basic info if FHIR is unavailable
      return {
        age: null,
        gender: 'Unknown',
        bloodType: 'Unknown',
        phone: null,
        email: null,
        address: null,
        primaryPhysician: 'Dr. Unknown',
      };
    }
  }

  private calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }

  // Get patient medical history (conditions and allergies) - HARDCODED DATA
  // TODO: Implement FHIR integration to fetch real medical history
  async getMedicalHistory(patientId: string): Promise<any> {
    const patient = await this.findOne(patientId);

    // Hardcoded medical history data for development
    // This should be replaced with actual FHIR server integration
    const hardcodedHistory = {
      conditions: [
        {
          name: 'Type 2 Diabetes Mellitus',
          status: 'active',
          onsetDate: '2019-03-15T00:00:00Z',
        },
        {
          name: 'Hypertension',
          status: 'active',
          onsetDate: '2020-07-22T00:00:00Z',
        },
        {
          name: 'Hyperlipidemia',
          status: 'active',
          onsetDate: '2021-01-10T00:00:00Z',
        },
      ],
      allergies: [
        {
          name: 'Penicillin',
          severity: 'severe',
          onsetDate: '2015-05-12T00:00:00Z',
        },
        {
          name: 'Shellfish',
          severity: 'moderate',
          onsetDate: '2018-09-03T00:00:00Z',
        },
      ],
      lastUpdated: new Date().toISOString(),
    };

    // Vary the data slightly based on patient ID for more realistic testing
    const patientIdNum = parseInt(patient.id) || 1;
    const conditions = hardcodedHistory.conditions.slice(0, (patientIdNum % 3) + 1);
    const allergies = hardcodedHistory.allergies.slice(0, (patientIdNum % 2) + 1);

    return {
      conditions,
      allergies,
      lastUpdated: hardcodedHistory.lastUpdated,
    };
  }
}

import { ApiProperty } from '@nestjs/swagger';

export class VitalSignsDto {
  @ApiProperty({ example: '120/80', description: 'Blood pressure reading' })
  bloodPressure: string;

  @ApiProperty({ example: 72, description: 'Heart rate in beats per minute' })
  heartRate: number;

  @ApiProperty({ example: 98.6, description: 'Body temperature in Fahrenheit' })
  temperature: number;

  @ApiProperty({ example: 98, description: 'Oxygen saturation percentage' })
  oxygenSaturation: number;

  @ApiProperty({ example: 16, description: 'Respiratory rate per minute' })
  respiratoryRate: number;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'When the vitals were recorded',
  })
  recordedAt: string;
}

export class LabResultDto {
  @ApiProperty({ example: 'CBC', description: 'Test name' })
  testName: string;

  @ApiProperty({
    example: 'Complete Blood Count',
    description: 'Test description',
  })
  testDescription: string;

  @ApiProperty({ example: 'Normal', description: 'Overall result status' })
  status: string;

  @ApiProperty({
    example: [
      {
        name: 'Hemoglobin',
        value: '14.2',
        unit: 'g/dL',
        normalRange: '12.0-15.5',
      },
      {
        name: 'White Blood Cells',
        value: '7.2',
        unit: 'K/uL',
        normalRange: '4.5-11.0',
      },
    ],
    description: 'Individual test results',
  })
  results: Array<{
    name: string;
    value: string;
    unit: string;
    normalRange: string;
    isAbnormal?: boolean;
  }>;

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'When the test was performed',
  })
  testDate: string;
}

export class AppointmentDto {
  @ApiProperty({
    example: 'Annual Physical',
    description: 'Type of appointment',
  })
  type: string;

  @ApiProperty({
    example: 'Dr. Sarah Johnson',
    description: 'Healthcare provider',
  })
  provider: string;

  @ApiProperty({
    example: '2024-02-20T14:00:00Z',
    description: 'Appointment date and time',
  })
  dateTime: string;

  @ApiProperty({ example: 'Scheduled', description: 'Appointment status' })
  status: string;

  @ApiProperty({
    example: 'Main Office',
    description: 'Location of appointment',
  })
  location: string;

  @ApiProperty({
    example: 'Routine checkup and physical examination',
    description: 'Appointment notes',
  })
  notes?: string;
}

export class MedicationDto {
  @ApiProperty({ example: 'Lisinopril', description: 'Medication name' })
  name: string;

  @ApiProperty({ example: '10mg', description: 'Dosage' })
  dosage: string;

  @ApiProperty({ example: 'Once daily', description: 'Frequency' })
  frequency: string;

  @ApiProperty({
    example: 'Hypertension',
    description: 'Condition being treated',
  })
  indication: string;

  @ApiProperty({ example: 'Dr. Smith', description: 'Prescribing physician' })
  prescriber: string;

  @ApiProperty({ example: '2024-01-01', description: 'Date prescribed' })
  prescribedDate: string;

  @ApiProperty({ example: 'Active', description: 'Medication status' })
  status: string;
}

export class HealthDataDto {
  @ApiProperty({ description: 'Latest vital signs' })
  vitals: VitalSignsDto;

  @ApiProperty({ description: 'Recent lab results', type: [LabResultDto] })
  labResults: LabResultDto[];

  @ApiProperty({ description: 'Upcoming appointments', type: [AppointmentDto] })
  appointments: AppointmentDto[];

  @ApiProperty({ description: 'Current medications', type: [MedicationDto] })
  medications: MedicationDto[];

  @ApiProperty({
    example: '2024-01-15T15:30:00Z',
    description: 'When this data was last updated',
  })
  lastUpdated: string;
}

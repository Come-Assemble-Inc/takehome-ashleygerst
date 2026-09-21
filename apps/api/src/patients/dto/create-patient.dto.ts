import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 'John', description: 'Patient first name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Patient last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: 'MRN123456',
    description: 'Medical record number - links to FHIR',
  })
  @IsString()
  @IsNotEmpty()
  medicalRecordNumber: string;

  @ApiProperty({
    example: 'PAT-abc123def456',
    description: 'FHIR Patient ID for API calls',
  })
  @IsString()
  @IsNotEmpty()
  fhirId: string;
}

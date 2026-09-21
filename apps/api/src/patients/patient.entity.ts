import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('patients')
export class Patient {
  @ApiProperty({ example: '1', description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'John', description: 'Patient first name' })
  @Column()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Patient last name' })
  @Column()
  lastName: string;

  @ApiProperty({
    example: 'MRN123456',
    description: 'Medical record number - links to FHIR',
  })
  @Column({ unique: true })
  medicalRecordNumber: string;

  @ApiProperty({
    example: 'PAT-abc123def456',
    description: 'FHIR Patient ID for API calls',
  })
  @Column({ unique: true })
  fhirId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: 'Full name of the patient' })
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

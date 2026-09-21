import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Patient } from './patient.entity';

// Response DTOs for better typing and documentation
export class PatientSearchResponseDto {
  @ApiProperty({
    description: 'List of patients matching the search criteria',
    type: [Patient],
  })
  patients: Patient[];

  @ApiProperty({ example: 5, description: 'Total number of results found' })
  total: number;

  @ApiProperty({ example: 'john', description: 'Search query used' })
  query: string;
}

export class PatientDemographicsDto {
  @ApiProperty({
    example: 45,
    description: 'Patient age in years',
    nullable: true,
  })
  age: number | null;

  @ApiProperty({
    example: 'male',
    description: 'Patient gender',
    enum: ['male', 'female', 'other', 'unknown'],
  })
  gender: string;

  @ApiProperty({ example: 'O+', description: 'Patient blood type' })
  bloodType: string;

  @ApiProperty({
    example: '+1-555-123-4567',
    description: 'Patient phone number',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    example: 'john.doe@email.com',
    description: 'Patient email address',
    nullable: true,
  })
  email: string | null;

  @ApiProperty({
    description: 'Patient address',
    nullable: true,
    example: {
      line: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
    },
  })
  address: {
    line: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;

  @ApiProperty({
    example: 'Dr. Sarah Johnson',
    description: 'Primary care physician name',
  })
  primaryPhysician: string;
}

export class MedicalConditionDto {
  @ApiProperty({
    example: 'Type 2 diabetes mellitus',
    description: 'Condition name',
  })
  name: string;

  @ApiProperty({
    example: 'active',
    description: 'Current status of the condition',
  })
  status: string;

  @ApiProperty({
    example: '2023-01-15T00:00:00Z',
    description: 'Date when condition was first diagnosed',
    nullable: true,
  })
  onsetDate: string | null;
}

export class AllergyDto {
  @ApiProperty({ example: 'Penicillin', description: 'Allergen name' })
  name: string;

  @ApiProperty({
    example: 'severe',
    description: 'Severity of allergic reaction',
    enum: ['mild', 'moderate', 'severe', 'unknown'],
  })
  severity: string;

  @ApiProperty({
    example: '2020-03-10T00:00:00Z',
    description: 'Date when allergy was first identified',
    nullable: true,
  })
  onsetDate: string | null;
}

export class MedicalHistoryDto {
  @ApiProperty({
    description: 'Active medical conditions',
    type: [MedicalConditionDto],
  })
  conditions: MedicalConditionDto[];

  @ApiProperty({
    description: 'Known allergies and intolerances',
    type: [AllergyDto],
  })
  allergies: AllergyDto[];

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'When this medical history was last updated',
  })
  lastUpdated: string;
}

@ApiTags('patients')
@ApiBearerAuth('JWT-auth')
@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all patients',
    description:
      'Retrieve a list of all patients in the system, ordered by last name and first name',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved list of patients',
    type: [Patient],
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred',
  })
  async findAll(): Promise<Patient[]> {
    try {
      return await this.patientsService.findAll();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve patients',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search patients',
    description:
      'Search for patients by first name, last name, or medical record number (MRN). Search is case-insensitive and supports partial matches.',
  })
  @ApiQuery({
    name: 'search',
    description: 'Search query - can be name or MRN',
    example: 'john',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    type: [Patient],
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiInternalServerErrorResponse({ description: 'Search operation failed' })
  async search(@Query('search') query: string): Promise<Patient[]> {
    if (!query || query.trim().length === 0) {
      throw new HttpException(
        'Search query cannot be empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.patientsService.searchPatients(query.trim());
    } catch (error) {
      throw new HttpException(
        'Failed to search patients',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get patient by ID',
    description:
      'Retrieve detailed information for a specific patient using their unique identifier',
  })
  @ApiParam({
    name: 'id',
    description: 'Patient unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient found and returned successfully',
    type: Patient,
  })
  @ApiNotFoundResponse({ description: 'Patient with specified ID not found' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiInternalServerErrorResponse({ description: 'Failed to retrieve patient' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Patient> {
    try {
      return await this.patientsService.findOne(id);
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve patient',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/demographics')
  @ApiOperation({
    summary: 'Get patient demographics',
    description:
      'Retrieve comprehensive demographic information for a patient including age, contact details, and primary care physician. Data is fetched from the FHIR server when available.',
  })
  @ApiParam({
    name: 'id',
    description: 'Patient unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Demographics retrieved successfully',
    type: PatientDemographicsDto,
  })
  @ApiNotFoundResponse({ description: 'Patient with specified ID not found' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve demographics data',
  })
  async getDemographics(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PatientDemographicsDto> {
    try {
      return await this.patientsService.getDemographics(id);
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve patient demographics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/medical-history')
  @ApiOperation({
    summary: 'Get patient medical history',
    description:
      'Retrieve comprehensive medical history including active conditions and known allergies. Data is sourced from the FHIR server and includes severity levels and onset dates when available.',
  })
  @ApiParam({
    name: 'id',
    description: 'Patient unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Medical history retrieved successfully',
    type: MedicalHistoryDto,
  })
  @ApiNotFoundResponse({ description: 'Patient with specified ID not found' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve medical history',
  })
  async getMedicalHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MedicalHistoryDto> {
    try {
      return await this.patientsService.getMedicalHistory(id);
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve patient medical history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { ArrowLeft, User, Users, Activity } from 'lucide-react';
import {
  getPatient,
  Patient,
  apiCall,
} from '../../../../../services/api-service';

interface Demographics {
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

interface MedicalHistory {
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

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const patientData = await getPatient(patientId);
        if (cancelled) return;
        setPatient(patientData);
        const [demoData, histData] = await Promise.all([
          apiCall<Demographics>(`/patients/${patientId}/demographics`),
          apiCall<MedicalHistory>(`/patients/${patientId}/medical-history`),
        ]);
        if (cancelled) return;
        setDemographics(demoData);
        setMedicalHistory(histData);
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching patient:', err);
          setError('Failed to load patient data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        Loading patient data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-500">
        {error}
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        Patient not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" className="gap-2 px-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </Button>
        <span className="text-sm text-muted-foreground">
          MRN: {patient.medicalRecordNumber}
        </span>
        <Badge className="ml-auto">Active</Badge>
      </div>

      {/* Top row: 3 cards */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Demographics */}
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-start justify-between pb-1">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Demographics
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {demographics ? (
              <>
                <p className="text-2xl font-bold leading-none mb-1">Age {demographics.age ?? '—'}</p>
                <p className="text-sm text-muted-foreground">
                  {demographics.gender}
                  {demographics.bloodType ? ` • Blood Type: ${demographics.bloodType}` : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No demographics data</p>
            )}
          </CardContent>
        </Card>

        {/* Care Team */}
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-start justify-between pb-1">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Care Team
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {demographics?.primaryPhysician ? (
              <>
                <p className="text-base font-bold leading-none mb-1">{demographics.primaryPhysician}</p>
                <p className="text-sm text-muted-foreground">Primary Care Physician</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No care team data</p>
            )}
          </CardContent>
        </Card>

        {/* Last Updated */}
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-start justify-between pb-1">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Last Updated
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {medicalHistory?.lastUpdated ? (
              <>
                <p className="text-base font-bold leading-none mb-1">
                  {new Date(medicalHistory.lastUpdated).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">Health records</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Medical History */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">Medical History</CardTitle>
          {medicalHistory?.lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date(medicalHistory.lastUpdated).toLocaleDateString()}
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {medicalHistory ? (
            <div className="flex flex-col md:flex-row gap-8">
              {/* Active Conditions */}
              <div className="flex-1">
                <p className="text-base font-semibold mb-3">Active Conditions</p>
                {medicalHistory.conditions.length > 0 ? (
                  <div className="space-y-2">
                    {medicalHistory.conditions.map((condition, i) => (
                      <p key={i} className="text-sm">
                        <span className="font-medium">{condition.name}</span>
                        {condition.onsetDate && (
                          <span className="text-muted-foreground">
                            {' '}(since {new Date(condition.onsetDate).toLocaleDateString()})
                          </span>
                        )}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No conditions recorded</p>
                )}
              </div>

              {/* Known Allergies */}
              <div className="flex-1">
                <p className="text-base font-semibold mb-3">Known Allergies</p>

                {medicalHistory.allergies.length > 0 ? (
                  <div className="space-y-2">
                    {medicalHistory.allergies.map((allergy, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{allergy.name}</span>
                        <Badge className="text-xs font-normal bg-red-100 text-red-600 hover:bg-red-100">
                          {allergy.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No allergies recorded</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No medical history data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

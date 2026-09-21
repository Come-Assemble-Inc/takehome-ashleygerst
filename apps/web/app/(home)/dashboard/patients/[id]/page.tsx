'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { ArrowLeft, User, Activity } from 'lucide-react';
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
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch patient basic info
      const patientData = await getPatient(patientId);
      setPatient(patientData);

      // Fetch demographics and medical history in parallel
      await Promise.all([fetchDemographics(), fetchMedicalHistory()]);
    } catch (error) {
      console.error('Error fetching patient:', error);
      setError('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDemographics = async () => {
    try {
      const data = await apiCall<Demographics>(
        `/patients/${patientId}/demographics`
      );
      setDemographics(data);
    } catch (error) {
      console.error('Error fetching demographics:', error);
    }
  };

  const fetchMedicalHistory = async () => {
    try {
      const data = await apiCall<MedicalHistory>(
        `/patients/${patientId}/medical-history`
      );
      setMedicalHistory(data);
    } catch (error) {
      console.error('Error fetching medical history:', error);
    }
  };

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

  return <div className="space-y-6">👋🏻 Patient cards go here.</div>;
}

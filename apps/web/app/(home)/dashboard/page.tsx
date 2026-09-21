'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { RecentSales } from './components/recent-sales';
import { Overview } from './components/overview';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Search, UserPlus, Users, Calendar, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  getPatients,
  searchPatients,
  Patient,
} from '../../../services/api-service';

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    todayAppointments: 0,
    criticalAlerts: 0,
  });
  const router = useRouter();

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      fetchPatients();
    }
  }, [searchQuery]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const patientsData = await getPatients();
      setPatients(patientsData);

      // Update stats based on actual patient count
      setStats({
        totalPatients: patientsData.length,
        activePatients: patientsData.length, // All patients are considered active for now
        todayAppointments: Math.floor(patientsData.length * 0.1), // Mock: ~10% have appointments today
        criticalAlerts: Math.floor(patientsData.length * 0.05), // Mock: ~5% have critical alerts
      });
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPatients();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const searchResults = await searchPatients(searchQuery);
      setPatients(searchResults);
    } catch (error) {
      console.error('Error searching patients:', error);
      setError('Failed to search patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = (patientId: string) => {
    router.push(`/dashboard/patients/${patientId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Patient Dashboard</h2>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Patients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              Registered in system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Patients
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePatients}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Alerts
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.criticalAlerts}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Patient List */}
      <Card>
        <CardHeader>
          <CardTitle>Patient List</CardTitle>
          <CardDescription>Manage and view patient information</CardDescription>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search patients by name or MRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8 text-red-500">{error}</div>
          )}
          {loading ? (
            <div className="text-center py-8">Loading patients...</div>
          ) : (
            <div className="space-y-4">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handlePatientClick(patient.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {patient.firstName[0]}
                        {patient.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{patient.fullName}</h3>
                      <p className="text-sm text-gray-500">
                        MRN: {patient.medicalRecordNumber}
                      </p>
                      <p className="text-xs text-gray-400">
                        FHIR ID: {patient.fhirId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Added:{' '}
                        {new Date(patient.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        Updated:{' '}
                        {new Date(patient.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
              ))}
              {patients.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery
                    ? 'No patients found matching your search.'
                    : 'No patients found.'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

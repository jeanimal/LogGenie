import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Database, AlertTriangle, Shield, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Sidebar from "@/components/sidebar";

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Get current database stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/analytics/stats'],
  });

  // Get companies list
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/companies'],
  });

  // Delete logs mutation
  const deleteLogsMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const url = companyId === 'all' 
        ? '/api/admin/delete-all-logs' 
        : `/api/admin/delete-company-logs/${companyId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete logs: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      const companyName = selectedCompany === 'all' 
        ? 'all companies' 
        : (companies as any)?.find((c: any) => c.id.toString() === selectedCompany)?.name || 'selected company';
        
      toast({
        title: "Success",
        description: `All logs for ${companyName} have been deleted from the database.`,
        variant: "default",
      });
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logs/timeline-range'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/top-ips'] });
      setIsDeleting(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete logs",
        variant: "destructive",
      });
      setIsDeleting(false);
    },
  });

  const handleDeleteLogs = () => {
    setIsDeleting(true);
    deleteLogsMutation.mutate(selectedCompany);
  };

  const getSelectedCompanyName = () => {
    if (selectedCompany === 'all') return 'all companies';
    return (companies as any)?.find((c: any) => c.id.toString() === selectedCompany)?.name || 'Unknown';
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <div className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600">System administration and maintenance tools</p>
            </div>
          </div>

          {/* Database Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span>Database Overview</span>
              </CardTitle>
              <CardDescription>
                Current database statistics and storage information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{(stats as any)?.totalLogs || 0}</div>
                    <div className="text-sm text-gray-600">Total Logs</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{(stats as any)?.recentUploads || 0}</div>
                    <div className="text-sm text-gray-600">Recent Uploads</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{(stats as any)?.anomalies || 0}</div>
                    <div className="text-sm text-gray-600">Anomalies</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{(stats as any)?.companies || 0}</div>
                    <div className="text-sm text-gray-600">Companies</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <span>Danger Zone</span>
              </CardTitle>
              <CardDescription className="text-red-600">
                Irreversible actions that permanently modify or delete data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-red-800 flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span>Delete Logs by Company</span>
                    </h3>
                    <p className="text-sm text-red-700">
                      Permanently removes log entries for selected company or all companies. This action cannot be undone.
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive" className="text-xs">
                        Irreversible
                      </Badge>
                      <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                        Database Operation
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="company-select" className="text-sm font-medium text-red-800">
                        Select Target
                      </Label>
                      <Select 
                        value={selectedCompany} 
                        onValueChange={setSelectedCompany}
                        disabled={companiesLoading}
                      >
                        <SelectTrigger className="w-full border-red-200">
                          <SelectValue placeholder="Select company or all" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Companies</SelectItem>
                          {(companies as any)?.map((company: any) => (
                            <SelectItem key={company.id} value={company.id.toString()}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                <div className="flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        disabled={isDeleting || deleteLogsMutation.isPending || !selectedCompany}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting ? 'Deleting...' : `Delete Logs for ${getSelectedCompanyName()}`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center space-x-2 text-red-700">
                          <AlertTriangle className="h-5 w-5" />
                          <span>Confirm Deletion</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-3">
                            <div>
                              You are about to permanently delete <strong>log entries for {getSelectedCompanyName()}</strong> from the database.
                            </div>
                            <div className="bg-red-50 p-3 rounded border border-red-200">
                              <div className="text-sm text-red-800 font-medium">This will remove:</div>
                              <ul className="list-disc list-inside text-sm text-red-700 mt-1 space-y-1">
                                <li>{selectedCompany === 'all' ? (stats as any)?.totalLogs || 0 : 'All'} log entries for {getSelectedCompanyName()}</li>
                                <li>Associated upload history and metadata</li>
                                <li>Related anomaly detection data</li>
                                <li>Timeline and analytics data</li>
                              </ul>
                            </div>
                            <div className="text-sm font-medium text-red-800">
                              This action cannot be undone. Are you absolutely sure?
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteLogs}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Yes, Delete Logs for {getSelectedCompanyName()}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
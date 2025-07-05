import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Upload,
  Shield,
  Building,
  BarChart,
  Search,
  TrendingUp,
  AlertTriangle,
  Network,
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Security Operations Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor and analyze cybersecurity logs for threat detection
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Logs</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.totalLogs || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <FileText className="text-primary h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recent Uploads</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.recentUploads || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Upload className="text-green-600 h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Anomalies Detected</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.anomalies || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertTriangle className="text-red-600 h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Companies</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.companies || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Building className="text-purple-600 h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition duration-200 cursor-pointer">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
                    <Upload className="text-primary text-xl h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Logs</h3>
                  <p className="text-sm text-gray-600 mb-4">Upload new log files for analysis</p>
                  <Button
                    onClick={() => setLocation("/upload")}
                    className="w-full bg-primary hover:bg-blue-700 text-white"
                  >
                    Start Upload
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition duration-200 cursor-pointer">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-4">
                    <FileText className="text-green-600 text-xl h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">View Logs</h3>
                  <p className="text-sm text-gray-600 mb-4">Browse and search through uploaded logs</p>
                  <Button
                    onClick={() => setLocation("/view-logs")}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    View All
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition duration-200 cursor-pointer">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-xl mb-4">
                    <BarChart className="text-yellow-600 text-xl h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Summarize</h3>
                  <p className="text-sm text-gray-600 mb-4">Generate summary reports and insights</p>
                  <Button
                    onClick={() => setLocation("/summarize")}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Generate Summary
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition duration-200 cursor-pointer">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl mb-4">
                    <Search className="text-red-600 text-xl h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Detect Anomalies</h3>
                  <p className="text-sm text-gray-600 mb-4">AI-powered threat detection analysis</p>
                  <Button
                    onClick={() => setLocation("/detect")}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    Run Detection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

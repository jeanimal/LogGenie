import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Info, AlertTriangle, Eye, X } from "lucide-react";

export default function DetectAnomalies() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [analysisType, setAnalysisType] = useState("full");
  const [sensitivity, setSensitivity] = useState("medium");
  const [timeRange, setTimeRange] = useState("7d");
  const [anomalies, setAnomalies] = useState<any[]>([]);

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

  const anomalyDetectionMutation = useMutation({
    mutationFn: async (params: { analysisType: string; sensitivity: string; timeRange: string }) => {
      const response = await apiRequest("POST", "/api/anomalies/detect", params);
      return response.json();
    },
    onSuccess: (data) => {
      setAnomalies(data.anomalies || []);
      toast({
        title: "Analysis Complete",
        description: `Found ${data.anomaliesCount} potential anomalies.`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to run anomaly detection. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRunDetection = () => {
    anomalyDetectionMutation.mutate({
      analysisType,
      sensitivity,
      timeRange,
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return <Badge variant="destructive">HIGH PRIORITY</Badge>;
      case "MEDIUM":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">MEDIUM PRIORITY</Badge>;
      case "LOW":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">LOW PRIORITY</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "border-red-200 bg-red-50";
      case "MEDIUM":
        return "border-yellow-200 bg-yellow-50";
      case "LOW":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
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
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI-Powered Anomaly Detection</h1>
            <p className="text-gray-600">Leverage machine learning to identify potential cybersecurity threats</p>
          </div>

          {/* Analysis Configuration */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detection Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Analysis Type</Label>
                  <Select value={analysisType} onValueChange={setAnalysisType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Analysis</SelectItem>
                      <SelectItem value="behavior">Behavioral Anomalies</SelectItem>
                      <SelectItem value="traffic">Traffic Patterns</SelectItem>
                      <SelectItem value="access">Access Anomalies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Sensitivity Level</Label>
                  <Select value={sensitivity} onValueChange={setSensitivity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High (More Alerts)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="low">Low (Fewer Alerts)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Time Range</Label>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-6">
                <Button
                  onClick={handleRunDetection}
                  disabled={anomalyDetectionMutation.isPending}
                  className="bg-primary hover:bg-blue-700 text-white"
                >
                  {anomalyDetectionMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Run Anomaly Detection
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Status */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Info className="text-primary h-4 w-4" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900">AI Analysis Integration</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    This page is configured to integrate with Large Language Models via LangChain for advanced threat detection. 
                    The system will analyze log patterns, identify anomalies, and provide cybersecurity insights.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {anomalies.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Detection Results</h3>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {anomalies.length} Anomalies Detected
                  </Badge>
                </div>

                {/* Anomaly Cards */}
                <div className="space-y-4">
                  {anomalies.map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className={`border rounded-lg p-4 ${getPriorityClass(anomaly.priority)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getPriorityBadge(anomaly.priority)}
                            <span className="text-sm text-gray-500">{anomaly.sourceIp}</span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">
                              {new Date(anomaly.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="text-base font-medium text-gray-900 mb-2">
                            {anomaly.title}
                          </h4>
                          <p className="text-sm text-gray-700 mb-3">
                            {anomaly.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {anomaly.tags.map((tag: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button variant="link" size="sm" className="text-primary hover:text-blue-700">
                            <Eye className="mr-1 h-3 w-3" />
                            View Details
                          </Button>
                          <Button variant="link" size="sm" className="text-gray-600 hover:text-gray-800">
                            <X className="mr-1 h-3 w-3" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex space-x-4">
                  <Button className="bg-primary hover:bg-blue-700 text-white">
                    Export Report
                  </Button>
                  <Button variant="secondary">
                    Schedule Analysis
                  </Button>
                  <Button variant="outline">
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Shield,
  Network,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  PieChart,
  LineChart,
} from "lucide-react";

export default function Summarize() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [aiSummary, setAiSummary] = useState<any>(null);

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

  const { data: topIPs, isLoading: topIPsLoading } = useQuery({
    queryKey: ["/api/analytics/top-ips", 10],
    enabled: isAuthenticated,
  });

  // AI Summary mutation
  const aiSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/ai/summarize-logs", "POST", {
        timeRange: "last_24h",
        includePatterns: true,
        includeRecommendations: true
      });
      return response;
    },
    onSuccess: (data) => {
      setAiSummary(data);
      toast({
        title: "AI Summary Generated",
        description: "Your log analysis summary is ready.",
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
        title: "Error",
        description: "Failed to generate AI summary. Please try again.",
        variant: "destructive",
      });
    },
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
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Log Analysis Summary</h1>
              <p className="text-gray-600">Statistical overview and insights from your security logs</p>
            </div>
            <Button 
              onClick={() => aiSummaryMutation.mutate()} 
              disabled={aiSummaryMutation.isPending}
              className="bg-primary hover:bg-blue-700 text-white"
            >
              {aiSummaryMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating AI Summary...
                </>
              ) : (
                "Generate AI Summary"
              )}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Events</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : (stats as any)?.totalLogs || 0}
                    </p>
                    <p className="text-sm text-green-600 mt-1 flex items-center">
                      <TrendingUp className="text-xs mr-1 h-3 w-3" />
                      +12% from last week
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
                    <p className="text-sm font-medium text-gray-600">Blocked Requests</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : (stats as any)?.blockedRequests || 0}
                    </p>
                    <p className="text-sm text-red-600 mt-1 flex items-center">
                      <TrendingUp className="text-xs mr-1 h-3 w-3" />
                      +3% from last week
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <Shield className="text-red-600 h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unique IPs</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : (stats as any)?.uniqueIPs || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 flex items-center">
                      <Minus className="text-xs mr-1 h-3 w-3" />
                      No change
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Network className="text-purple-600 h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">High Risk Events</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : (stats as any)?.highRiskEvents || 0}
                    </p>
                    <p className="text-sm text-yellow-600 mt-1 flex items-center">
                      <TrendingDown className="text-xs mr-1 h-3 w-3" />
                      -2 from yesterday
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <AlertTriangle className="text-yellow-600 h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Event Types Chart */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Types Distribution</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center text-gray-500">
                    <PieChart className="h-16 w-16 mx-auto mb-4" />
                    <p className="font-medium">Pie Chart</p>
                    <p className="text-sm">Event Types Distribution</p>
                    <p className="text-xs mt-2">Chart implementation with recharts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Levels Chart */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Level Breakdown</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4" />
                    <p className="font-medium">Bar Chart</p>
                    <p className="text-sm">Risk Level Distribution</p>
                    <p className="text-xs mt-2">Chart implementation with recharts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Chart */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
                <div className="flex space-x-2">
                  <Button size="sm" className="bg-primary text-white">24H</Button>
                  <Button size="sm" variant="outline">7D</Button>
                  <Button size="sm" variant="outline">30D</Button>
                </div>
              </div>
              <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <LineChart className="h-16 w-16 mx-auto mb-4" />
                  <p className="font-medium">Line Chart</p>
                  <p className="text-sm">Security Events Over Time</p>
                  <p className="text-xs mt-2">Chart implementation with recharts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Sources Table */}
          <Card>
            <CardContent className="p-0">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Top Source IPs</h3>
              </div>
              {topIPsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading top IPs...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Events</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(topIPs as any)?.map?.((ip: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{ip.sourceIp}</TableCell>
                          <TableCell>{ip.eventCount}</TableCell>
                          <TableCell>{ip.riskScore.toFixed(1)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                ip.status === "High Risk"
                                  ? "destructive"
                                  : ip.status === "Medium Risk"
                                  ? "secondary"
                                  : "default"
                              }
                              className={
                                ip.status === "Medium Risk"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : ip.status === "Low Risk"
                                  ? "bg-green-100 text-green-800"
                                  : ""
                              }
                            >
                              {ip.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Summary Section */}
          {aiSummary && (
            <Card className="mt-8">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">AI-Generated Analysis Summary</h3>
                
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-3">Executive Summary</h4>
                  <p className="text-blue-800 leading-relaxed">{aiSummary.summary}</p>
                </div>

                {aiSummary.keyFindings && aiSummary.keyFindings.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Key Findings</h4>
                    <ul className="space-y-2">
                      {aiSummary.keyFindings.map((finding: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-gray-700">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiSummary.securityRecommendations && aiSummary.securityRecommendations.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Security Recommendations</h4>
                    <div className="space-y-3">
                      {aiSummary.securityRecommendations.map((rec: any, index: number) => (
                        <div key={index} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                          <div className="flex items-center mb-1">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                            <span className="font-medium text-yellow-800">{rec.priority} Priority</span>
                          </div>
                          <p className="text-yellow-700">{rec.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiSummary.patternAnalysis && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Pattern Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiSummary.patternAnalysis.suspiciousPatterns?.length > 0 && (
                        <div className="p-4 bg-red-50 rounded-lg border">
                          <h5 className="font-medium text-red-900 mb-2">Suspicious Patterns</h5>
                          <ul className="text-red-800 text-sm space-y-1">
                            {aiSummary.patternAnalysis.suspiciousPatterns.map((pattern: string, index: number) => (
                              <li key={index}>• {pattern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiSummary.patternAnalysis.normalPatterns?.length > 0 && (
                        <div className="p-4 bg-green-50 rounded-lg border">
                          <h5 className="font-medium text-green-900 mb-2">Normal Patterns</h5>
                          <ul className="text-green-800 text-sm space-y-1">
                            {aiSummary.patternAnalysis.normalPatterns.map((pattern: string, index: number) => (
                              <li key={index}>• {pattern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex space-x-4 pt-4 border-t">
                  <Button variant="outline" className="text-gray-600">
                    Export Report
                  </Button>
                  <Button variant="outline" className="text-gray-600">
                    Share Analysis
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

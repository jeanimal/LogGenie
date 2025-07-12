import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Info,
  AlertTriangle,
  Eye,
  X,
  Plus,
  Minus,
  Download,
  Calendar,
  Clock,
  Filter,
  Brain,
} from "lucide-react";

export default function DetectAnomalies() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Timeline filter state
  const [companyFilter, setCompanyFilter] = useState("all");
  const [timelineRange, setTimelineRange] = useState<[number, number]>([0, 100]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<number>>(
    new Set(),
  );
  const [expandedAnomaly, setExpandedAnomaly] = useState<number | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const [logDetails, setLogDetails] = useState<Map<number, any[]>>(new Map());
  const [sortCriteria, setSortCriteria] = useState<
    Array<{ field: string; order: string }>
  >([
    { field: "severity", order: "desc" },
    { field: "confidence", order: "desc" },
  ]);
  const [temperature, setTemperature] = useState<number>(0.2);
  const [maxTokens, setMaxTokens] = useState<number>(2000);

  // Multi-level sorting function for anomalies
  const sortAnomalies = (anomaliesToSort: any[]) => {
    return [...anomaliesToSort].sort((a, b) => {
      for (const criterion of sortCriteria) {
        let compareValue = 0;

        switch (criterion.field) {
          case "severity":
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            compareValue =
              (severityOrder[a.severity as keyof typeof severityOrder] || 0) -
              (severityOrder[b.severity as keyof typeof severityOrder] || 0);
            break;
          case "category":
            compareValue = a.category.localeCompare(b.category);
            break;
          case "confidence":
            compareValue = a.confidence - b.confidence;
            break;
          case "logCount":
            compareValue = (a.logIds?.length || 0) - (b.logIds?.length || 0);
            break;
          default:
            continue;
        }

        // Apply sort order
        const adjustedValue =
          criterion.order === "asc" ? compareValue : -compareValue;

        // If values are different, return the result; otherwise, continue to next criterion
        if (adjustedValue !== 0) {
          return adjustedValue;
        }
      }

      return 0; // All criteria are equal
    });
  };

  // Helper functions for managing sort criteria
  const addSortCriterion = () => {
    if (sortCriteria.length < 4) {
      // Limit to 4 criteria
      setSortCriteria([...sortCriteria, { field: "severity", order: "desc" }]);
    }
  };

  const removeSortCriterion = (index: number) => {
    if (sortCriteria.length > 1) {
      // Keep at least one criterion
      setSortCriteria(sortCriteria.filter((_, i) => i !== index));
    }
  };

  // Query for companies
  const { data: companies } = useQuery({
    queryKey: ["/api/companies"],
    enabled: isAuthenticated,
  });

  // Query for timeline data
  const { data: timelineData } = useQuery({
    queryKey: ["/api/logs/timeline-range", companyFilter === "all" ? "" : companyFilter],
    enabled: isAuthenticated,
  });

  // Timeline helper functions
  const getTimelineRange = () => {
    const data = timelineData as any;
    if (!data?.earliestTimestamp || !data?.latestTimestamp) {
      return { min: 0, max: 100, earliest: null, latest: null };
    }
    const earliest = new Date(data.earliestTimestamp);
    const latest = new Date(data.latestTimestamp);
    return { min: 0, max: 100, earliest, latest };
  };

  const convertSliderToDate = (value: number) => {
    const { earliest, latest } = getTimelineRange();
    if (!earliest || !latest) return null;
    
    const range = latest.getTime() - earliest.getTime();
    const timestamp = earliest.getTime() + (range * value / 100);
    return new Date(timestamp);
  };

  const updateDateRange = (sliderValues: [number, number]) => {
    const startDateObj = convertSliderToDate(sliderValues[0]);
    const endDateObj = convertSliderToDate(sliderValues[1]);
    
    if (startDateObj && endDateObj) {
      setStartDate(startDateObj.toISOString());
      setEndDate(endDateObj.toISOString());
    }
  };

  // Update timeline when slider changes
  useEffect(() => {
    updateDateRange(timelineRange);
  }, [timelineRange, timelineData]);

  const updateSortCriterion = (index: number, field: string, order: string) => {
    const newCriteria = [...sortCriteria];
    newCriteria[index] = { field, order };
    setSortCriteria(newCriteria);
  };

  // Export report functionality
  const exportReport = () => {
    if (anomalies.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please run anomaly detection first to generate a report.",
        variant: "destructive",
      });
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportData = {
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        reportType: "Cybersecurity Anomaly Detection Report",
        analysisConfiguration: {
          analysisType: "full",
          sensitivity: "medium",
          aiConfiguration: {
            temperature,
            maxTokens,
          },
          companyFilter,
          dateRange: {
            startDate,
            endDate,
          },
        },
        sortingCriteria: sortCriteria,
      },
      executiveSummary: summary,
      anomalies: sortAnomalies(anomalies).map((anomaly, index) => ({
        id: index + 1,
        severity: anomaly.severity,
        category: anomaly.category,
        description: anomaly.description,
        confidence: Math.round((anomaly.confidence || 0) * 100),
        logIds: anomaly.logIds || [],
        logCount: anomaly.logIds?.length || 1,
        indicators: anomaly.indicators || [],
        recommendedAction: anomaly.recommendedAction,
        status: dismissedAnomalies.has(anomalies.indexOf(anomaly))
          ? "dismissed"
          : "active",
      })),
      statisticalSummary: {
        totalAnomalies: anomalies.length,
        activeAnomalies: anomalies.filter(
          (_, index) => !dismissedAnomalies.has(index),
        ).length,
        dismissedAnomalies: dismissedAnomalies.size,
        severityBreakdown: {
          critical: anomalies.filter((a) => a.severity === "critical").length,
          high: anomalies.filter((a) => a.severity === "high").length,
          medium: anomalies.filter((a) => a.severity === "medium").length,
          low: anomalies.filter((a) => a.severity === "low").length,
        },
      },
    };

    // Convert to JSON string with pretty formatting
    const jsonContent = JSON.stringify(reportData, null, 2);

    // Create and download the file
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `anomaly-detection-report-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Exported",
      description: `Anomaly detection report saved as anomaly-detection-report-${timestamp}.json`,
    });
  };

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
    mutationFn: async (params: {
      companyId?: string;
      startDate?: string;
      endDate?: string;
      temperature: number;
      maxTokens: number;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/anomalies/detect",
        params,
      );
      return response.json();
    },
    onSuccess: (data) => {
      setAnomalies(data.anomalies || []);
      setSummary(data.summary || null);
      toast({
        title: "Analysis Complete",
        description: `Found ${data.anomalies?.length || 0} potential anomalies.`,
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
        description:
          error.message || "Failed to run anomaly detection. Please try again.",
        variant: "destructive",
      });
    },
  });

  const fetchLogsMutation = useMutation({
    mutationFn: async ({
      anomalyIndex,
      logIds,
    }: {
      anomalyIndex: number;
      logIds: number[];
    }) => {
      const response = await apiRequest("POST", `/api/logs/by-ids`, { logIds });
      const logs = await response.json();
      return { anomalyIndex, logs };
    },
    onSuccess: ({ anomalyIndex, logs }) => {
      const newLogDetails = new Map(logDetails);
      newLogDetails.set(anomalyIndex, logs);
      setLogDetails(newLogDetails);
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
        title: "Failed to Load Log Details",
        description: "Unable to fetch log details. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRunDetection = () => {
    const params: any = {
      temperature,
      maxTokens,
    };
    
    if (companyFilter !== "all") {
      params.companyId = companyFilter;
    }
    
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    
    anomalyDetectionMutation.mutate(params);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return <Badge variant="destructive">CRITICAL</Badge>;
      case "high":
        return <Badge variant="destructive">HIGH</Badge>;
      case "medium":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            MEDIUM
          </Badge>
        );
      case "low":
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            LOW
          </Badge>
        );
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  // Handler functions
  const handleDismissAnomaly = (anomalyIndex: number) => {
    setDismissedAnomalies((prev) => {
      const newSet = new Set(prev);
      newSet.add(anomalyIndex);
      return newSet;
    });
    toast({
      title: "Anomaly Dismissed",
      description: "The anomaly has been marked as dismissed.",
    });
  };

  const handleViewDetails = (anomalyIndex: number, logIds: number[]) => {
    if (expandedAnomaly === anomalyIndex) {
      // Collapse if already expanded
      setExpandedAnomaly(null);
    } else {
      // Expand and fetch log details if not already loaded
      setExpandedAnomaly(anomalyIndex);
      if (!logDetails.has(anomalyIndex)) {
        fetchLogsMutation.mutate({ anomalyIndex, logIds });
      }
    }
  };

  // Filter and sort anomalies based on dismissed state and sorting preferences
  const filteredAnomalies = showDismissed
    ? anomalies.filter((anomaly, index) => dismissedAnomalies.has(index))
    : anomalies.filter((anomaly, index) => !dismissedAnomalies.has(index));

  const visibleAnomalies = sortAnomalies(filteredAnomalies);

  const dismissedCount = anomalies.filter((anomaly, index) =>
    dismissedAnomalies.has(index),
  ).length;

  const getSeverityClass = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "border-red-500 bg-red-50";
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI-Powered Anomaly Detection
            </h1>
            <p className="text-gray-600">
              Leverage machine learning to identify potential cybersecurity
              threats
            </p>
          </div>

          {/* Log Filtering Section */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Filter className="h-5 w-5 mr-2 text-blue-600" />
                Log Filtering
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Company</Label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Companies" />
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

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <Label className="text-sm font-medium text-gray-700">Timeline Filter</Label>
                  </div>
                  
                  {(timelineData as any)?.earliestTimestamp && (timelineData as any)?.latestTimestamp ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-gray-700">
                          <span>Start Time</span>
                          <span>End Time</span>
                        </div>
                        
                        <Slider
                          value={timelineRange}
                          onValueChange={(value) => {
                            setTimelineRange(value as [number, number]);
                          }}
                          max={100}
                          min={0}
                          step={1}
                          className="w-full"
                        />
                        
                        <div className="flex justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-blue-500" />
                            <span className="font-medium">From:</span>
                            <span className="ml-1">{convertSliderToDate(timelineRange[0])?.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-blue-500" />
                            <span className="font-medium">To:</span>
                            <span className="ml-1">{convertSliderToDate(timelineRange[1])?.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400 text-center border-t pt-2">
                        Total range: {new Date((timelineData as any).earliestTimestamp).toLocaleDateString()} 
                        → {new Date((timelineData as any).latestTimestamp).toLocaleDateString()}
                        <div className="mt-1">
                          <span className="text-blue-600 font-medium">{(timelineData as any).totalLogs}</span> total logs
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 py-4">
                      Loading timeline data...
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration Section */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Brain className="h-5 w-5 mr-2 text-purple-600" />
                AI Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">
                    AI Temperature
                  </Label>
                  <Select
                    value={temperature.toString()}
                    onValueChange={(value) => setTemperature(parseFloat(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select temperature">
                        {temperature === 0 && "0.0 (Deterministic)"}
                        {temperature === 0.2 && "0.2 (Focused)"}
                        {temperature === 0.5 && "0.5 (Balanced)"}
                        {temperature === 0.8 && "0.8 (Creative)"}
                        {temperature === 1 && "1.0 (Very Creative)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0.0 (Deterministic)</SelectItem>
                      <SelectItem value="0.2">0.2 (Focused)</SelectItem>
                      <SelectItem value="0.5">0.5 (Balanced)</SelectItem>
                      <SelectItem value="0.8">0.8 (Creative)</SelectItem>
                      <SelectItem value="1">1.0 (Very Creative)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Lower values make the AI more focused and deterministic
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">
                    Max Tokens
                  </Label>
                  <Select
                    value={maxTokens.toString()}
                    onValueChange={(value) => setMaxTokens(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">1,000 (Concise)</SelectItem>
                      <SelectItem value="2000">2,000 (Standard)</SelectItem>
                      <SelectItem value="3000">3,000 (Detailed)</SelectItem>
                      <SelectItem value="4000">
                        4,000 (Comprehensive)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Higher values generate more detailed analysis reports
                  </p>
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
                  <h4 className="text-sm font-medium text-blue-900">
                    AI Analysis Integration
                  </h4>
                  <p className="text-sm text-blue-800 mt-1">
                    The system uses Open AI's GPT to analyze log patterns,
                    identify anomalies, and provide cybersecurity insights.
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detection Results
                  </h3>
                  <div className="flex items-center space-x-4">
                    {dismissedCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDismissed(!showDismissed)}
                        className="text-gray-600"
                      >
                        {showDismissed
                          ? "Show Active"
                          : `Show Dismissed (${dismissedCount})`}
                      </Button>
                    )}
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800"
                    >
                      {showDismissed
                        ? `${dismissedCount} Dismissed`
                        : `${visibleAnomalies.length} Active`}
                    </Badge>
                  </div>
                </div>

                {/* Multi-Level Sorting Controls */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-sm font-medium text-gray-700">
                      Sort Criteria (in order of priority):
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addSortCriterion}
                      disabled={sortCriteria.length >= 4}
                      className="text-xs"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Criterion
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {sortCriteria.map((criterion, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500 w-6">
                          {index + 1}.
                        </span>

                        <Select
                          value={criterion.field}
                          onValueChange={(field) =>
                            updateSortCriterion(index, field, criterion.order)
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="severity">Severity</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="confidence">
                              Confidence
                            </SelectItem>
                            <SelectItem value="logCount">Log Count</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={criterion.order}
                          onValueChange={(order) =>
                            updateSortCriterion(index, criterion.field, order)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">High to Low</SelectItem>
                            <SelectItem value="asc">Low to High</SelectItem>
                          </SelectContent>
                        </Select>

                        {sortCriteria.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeSortCriterion(index)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analysis Summary */}
                {summary && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Analysis Summary
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {summary.totalLogsAnalyzed}
                        </div>
                        <div className="text-sm text-gray-600">
                          Logs Analyzed
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {summary.anomaliesFound}
                        </div>
                        <div className="text-sm text-gray-600">
                          Anomalies Found
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-lg font-semibold ${summary.highestSeverity === "critical" ? "text-red-600" : summary.highestSeverity === "high" ? "text-red-500" : summary.highestSeverity === "medium" ? "text-yellow-600" : "text-blue-600"}`}
                        >
                          {summary.highestSeverity?.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600">
                          Highest Severity
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {summary.commonPatterns?.length || 0}
                        </div>
                        <div className="text-sm text-gray-600">
                          Patterns Found
                        </div>
                      </div>
                    </div>

                    {summary.commonPatterns &&
                      summary.commonPatterns.length > 0 && (
                        <div className="mb-4">
                          <strong className="text-sm text-gray-900">
                            Common Patterns:
                          </strong>
                          <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                            {summary.commonPatterns.map(
                              (pattern: string, index: number) => (
                                <li key={index}>{pattern}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                    {summary.recommendations &&
                      summary.recommendations.length > 0 && (
                        <div>
                          <strong className="text-sm text-gray-900">
                            Recommendations:
                          </strong>
                          <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                            {summary.recommendations.map(
                              (rec: string, index: number) => (
                                <li key={index}>{rec}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

                {/* Anomaly Cards */}
                <div className="space-y-4">
                  {visibleAnomalies.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        {showDismissed
                          ? "No dismissed anomalies"
                          : "No active anomalies"}
                      </div>
                      <p className="text-sm text-gray-500">
                        {showDismissed
                          ? "All anomalies are currently active"
                          : dismissedCount > 0
                            ? `${dismissedCount} anomaly(ies) have been dismissed`
                            : "Great! No threats detected in the analyzed logs"}
                      </p>
                    </div>
                  ) : (
                    visibleAnomalies.map((anomaly, displayIndex) => {
                      const originalIndex = anomalies.indexOf(anomaly);
                      return (
                        <div
                          key={originalIndex}
                          className={`border rounded-lg p-4 ${getSeverityClass(anomaly.severity)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                {getSeverityBadge(anomaly.severity)}
                                <Badge variant="outline" className="text-xs">
                                  {anomaly.category}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-purple-50 text-purple-700"
                                >
                                  {anomaly.logIds?.length || 1} log
                                  {(anomaly.logIds?.length || 1) > 1 ? "s" : ""}
                                </Badge>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-500">
                                  Confidence:{" "}
                                  {Math.round((anomaly.confidence || 0) * 100)}%
                                </span>
                              </div>
                              <h4 className="text-base font-medium text-gray-900 mb-2">
                                {anomaly.description}
                              </h4>
                              <div className="text-sm text-gray-700 mb-3">
                                <strong>Recommended Action:</strong>{" "}
                                {anomaly.recommendedAction}
                              </div>
                              {anomaly.indicators &&
                                anomaly.indicators.length > 0 && (
                                  <div className="mb-3">
                                    <strong className="text-sm">
                                      Indicators:
                                    </strong>
                                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                      {anomaly.indicators.map(
                                        (indicator: string, index: number) => (
                                          <li key={index}>{indicator}</li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <Button
                                variant="link"
                                size="sm"
                                className="text-primary hover:text-blue-700"
                                onClick={() =>
                                  handleViewDetails(
                                    originalIndex,
                                    anomaly.logIds || [],
                                  )
                                }
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                {expandedAnomaly === originalIndex
                                  ? "Hide Details"
                                  : "View Details"}
                              </Button>
                              <Button
                                variant="link"
                                size="sm"
                                className="text-gray-600 hover:text-gray-800"
                                onClick={() =>
                                  handleDismissAnomaly(originalIndex)
                                }
                              >
                                <X className="mr-1 h-3 w-3" />
                                Dismiss
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Details Section */}
                          {expandedAnomaly === originalIndex && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border-t">
                              <h5 className="font-medium text-gray-900 mb-3">
                                Detailed Analysis
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong className="text-gray-700">
                                    Log IDs:
                                  </strong>
                                  <p className="text-gray-600">
                                    {anomaly.logIds?.join(", ") || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <strong className="text-gray-700">
                                    Severity Level:
                                  </strong>
                                  <p className="text-gray-600 capitalize">
                                    {anomaly.severity}
                                  </p>
                                </div>
                                <div>
                                  <strong className="text-gray-700">
                                    Category:
                                  </strong>
                                  <p className="text-gray-600">
                                    {anomaly.category}
                                  </p>
                                </div>
                                <div>
                                  <strong className="text-gray-700">
                                    Confidence Score:
                                  </strong>
                                  <p className="text-gray-600">
                                    {Math.round(
                                      (anomaly.confidence || 0) * 100,
                                    )}
                                    %
                                  </p>
                                </div>
                              </div>

                              {anomaly.indicators &&
                                anomaly.indicators.length > 0 && (
                                  <div className="mt-4">
                                    <strong className="text-gray-700">
                                      Technical Indicators:
                                    </strong>
                                    <div className="mt-2 space-y-1">
                                      {anomaly.indicators.map(
                                        (indicator: string, index: number) => (
                                          <div
                                            key={index}
                                            className="flex items-start"
                                          >
                                            <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                                            <span className="text-gray-600 text-sm">
                                              {indicator}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                              <div className="mt-4">
                                <strong className="text-gray-700">
                                  Recommended Response:
                                </strong>
                                <p className="text-gray-600 text-sm mt-1">
                                  {anomaly.recommendedAction}
                                </p>
                              </div>

                              {/* Log Details Section */}
                              <div className="mt-6 border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <strong className="text-gray-700">
                                    Related Log Entries
                                  </strong>
                                  {fetchLogsMutation.isPending && (
                                    <span className="text-sm text-gray-500">
                                      Loading log details...
                                    </span>
                                  )}
                                </div>

                                {logDetails.has(originalIndex) ? (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">ID</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Timestamp</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Source IP</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">User ID</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Destination URL</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Action</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Category</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Response Time</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {logDetails
                                          .get(originalIndex)
                                          ?.map((log: any, logIndex: number) => (
                                            <tr key={logIndex} className="border-b hover:bg-gray-50">
                                              <td className="px-3 py-2 font-mono text-xs text-gray-600">{log.id}</td>
                                              <td className="px-3 py-2 font-mono text-xs">
                                                {new Date(log.timestamp).toLocaleString()}
                                              </td>
                                              <td className="px-3 py-2 font-mono text-xs">{log.sourceIp}</td>
                                              <td className="px-3 py-2 font-mono text-xs font-medium text-blue-600">{log.userId}</td>
                                              <td className="px-3 py-2 font-mono text-xs max-w-xs truncate" title={log.destinationUrl}>
                                                {log.destinationUrl}
                                              </td>
                                              <td className="px-3 py-2">
                                                <Badge 
                                                  variant={log.action === 'ALLOW' ? 'default' : log.action === 'BLOCK' ? 'destructive' : 'secondary'}
                                                  className="text-xs"
                                                >
                                                  {log.action}
                                                </Badge>
                                              </td>
                                              <td className="px-3 py-2 text-xs">{log.category || 'N/A'}</td>
                                              <td className="px-3 py-2 font-mono text-xs">
                                                {log.responseTime ? `${log.responseTime}ms` : 'N/A'}
                                              </td>
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  !fetchLogsMutation.isPending && (
                                    <div className="text-sm text-gray-500 italic">
                                      Click "View Details" to load related log
                                      entries
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex space-x-4">
                  <Button
                    onClick={exportReport}
                    className="bg-primary hover:bg-blue-700 text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAnomalies([]);
                      setSummary(null);
                      setDismissedAnomalies(new Set());
                      setExpandedAnomaly(null);
                      setLogDetails(new Map());
                      toast({
                        title: "Results Cleared",
                        description:
                          "All anomaly detection results have been cleared.",
                      });
                    }}
                  >
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

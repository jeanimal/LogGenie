import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Clock } from "lucide-react";

export default function ViewLogs() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());

  // Get filter values from URL or use defaults
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const companyFilter = searchParams.get('company') || 'all';
  const timelineStart = parseInt(searchParams.get('timelineStart') || '0');
  const timelineEnd = parseInt(searchParams.get('timelineEnd') || '100');
  const timelineRange: [number, number] = [timelineStart, timelineEnd];
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  // Function to update URL with new filter values
  const updateFilters = (newFilters: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    setLocation(`/view-logs?${params.toString()}`);
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

  const { data: companies } = useQuery({
    queryKey: ["/api/companies"],
    enabled: isAuthenticated,
  });

  const { data: timelineData } = useQuery({
    queryKey: ["/api/logs/timeline-range", companyFilter === "all" ? "" : companyFilter],
    enabled: isAuthenticated,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["/api/logs", page, limit, companyFilter === "all" ? "" : companyFilter, startDate, endDate],
    enabled: isAuthenticated,
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

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
      updateFilters({
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        page: 1
      });
    }
  };

  // Update timeline when slider changes
  useEffect(() => {
    updateDateRange(timelineRange);
  }, [timelineRange, timelineData]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "BLOCKED":
        return <Badge variant="destructive">BLOCKED</Badge>;
      case "ALLOWED":
        return <Badge variant="default" className="bg-green-100 text-green-800">ALLOWED</Badge>;
      case "FLAGGED":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">FLAGGED</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const totalPages = (logsData as any)?.total ? Math.ceil((logsData as any).total / limit) : 0;

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">View Security Logs</h1>
              <p className="text-gray-600">Browse and analyze uploaded security log entries</p>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center space-x-4">
              <Label className="text-sm font-medium text-gray-700">Show:</Label>
              <Select value={limit.toString()} onValueChange={(value) => updateFilters({ limit: parseInt(value), page: 1 })}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Company</Label>
                  <Select value={companyFilter} onValueChange={(value) => updateFilters({ company: value, page: 1 })}>
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
                  <Label className="text-sm font-medium text-gray-700 mb-2">Log Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="zscaler_web_proxy">ZScaler Web Proxy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1 md:col-span-1">
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
                            const [start, end] = value as [number, number];
                            updateFilters({ 
                              timelineStart: start, 
                              timelineEnd: end, 
                              page: 1 
                            });
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

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading logs...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Source IP</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Response Time</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(logsData as any)?.logs?.map((log: any) => (
                          <TableRow key={log.id} className="hover:bg-gray-50">
                            <TableCell className="text-sm text-gray-900">
                              {formatTimestamp(log.timestamp)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-900">
                              {log.sourceIp}
                            </TableCell>
                            <TableCell className="text-sm text-gray-900">
                              {log.userId}
                            </TableCell>
                            <TableCell className="text-sm text-gray-900">
                              {log.destinationUrl}
                            </TableCell>
                            <TableCell>
                              {getActionBadge(log.action)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-900">
                              {log.category || 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm text-gray-900">
                              {log.responseTime ? `${log.responseTime}ms` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Button variant="link" className="text-primary hover:text-blue-700 p-0">
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination Footer */}
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing{" "}
                        <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
                        <span className="font-medium">
                          {Math.min(page * limit, (logsData as any)?.total || 0)}
                        </span>{" "}
                        of <span className="font-medium">{(logsData as any)?.total || 0}</span> results
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateFilters({ page: Math.max(1, page - 1) })}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateFilters({ page: pageNum })}
                              className={page === pageNum ? "bg-primary text-white" : ""}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        {totalPages > 5 && (
                          <>
                            <span className="px-3 py-2 text-sm text-gray-500">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateFilters({ page: totalPages })}
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateFilters({ page: Math.min(totalPages, page + 1) })}
                          disabled={page === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

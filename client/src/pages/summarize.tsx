import { useEffect, useState } from "react";
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
  Filter,
  Calendar,
  Clock,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
} from "recharts";

type LogEntry = {
  id: number;
  timestamp: string;
  sourceIp: string;
  userId: string;
  destinationUrl: string;
  action: string;
  category: string | null;
  responseTime: number | null;
};

export default function Summarize() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());

  // Get filter values from URL or use defaults
  const companyFilter = searchParams.get('company') || 'all';
  const logTypeFilter = searchParams.get('logType') || 'all';
  const timelineStart = parseInt(searchParams.get('timelineStart') || '0');
  const timelineEnd = parseInt(searchParams.get('timelineEnd') || '100');
  const timelineRange: [number, number] = [timelineStart, timelineEnd];
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  // Pattern view state
  const [patternView, setPatternView] = useState<'hourly' | 'daily' | 'weekly'>('hourly');

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
    
    setLocation(`/summarize?${params.toString()}`);
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

  const { data: logTypes } = useQuery({
    queryKey: ["/api/log-types"],
    enabled: isAuthenticated,
  });

  const { data: timelineData } = useQuery({
    queryKey: ["/api/logs/timeline-range", companyFilter === "all" ? "" : companyFilter],
    enabled: isAuthenticated,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["/api/logs", companyFilter, logTypeFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '1000',
        ...(companyFilter !== 'all' && { companyId: companyFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      
      const res = await fetch(`/api/logs?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Calculate analytics from filtered logs
  const analytics = logsData?.logs ? calculateAnalytics(logsData.logs) : null;

  // Timeline slider handling
  const handleTimelineChange = (value: number[]) => {
    const [start, end] = value as [number, number];
    
    if (!timelineData) return;
    
    const startTime = new Date((timelineData as any).earliestTimestamp);
    const endTime = new Date((timelineData as any).latestTimestamp);
    const totalMs = endTime.getTime() - startTime.getTime();
    
    const selectedStartTime = new Date(startTime.getTime() + (totalMs * start / 100));
    const selectedEndTime = new Date(startTime.getTime() + (totalMs * end / 100));
    
    updateFilters({
      timelineStart: start,
      timelineEnd: end,
      startDate: selectedStartTime.toISOString(),
      endDate: selectedEndTime.toISOString(),
    });
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
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Log Analytics Summary</h1>
            <p className="text-gray-600">Comprehensive analysis and insights from filtered security logs</p>
          </div>

          {/* Filters Section */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Company Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Company</Label>
                  <Select
                    value={companyFilter}
                    onValueChange={(value) => updateFilters({ company: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
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

                {/* Log Type Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Log Type</Label>
                  <Select
                    value={logTypeFilter}
                    onValueChange={(value) => updateFilters({ logType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select log type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Log Types</SelectItem>
                      {(logTypes as any)?.map((logType: any) => (
                        <SelectItem key={logType.id} value={logType.id.toString()}>
                          {logType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timeline Range */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <Label className="text-sm font-medium text-gray-700">Timeline Range</Label>
                  </div>
                  {timelineData && (
                    <div className="space-y-3">
                      <Slider
                        value={timelineRange}
                        onValueChange={handleTimelineChange}
                        max={100}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{startDate ? new Date(startDate).toLocaleDateString() : new Date((timelineData as any).earliestTimestamp).toLocaleDateString()}</span>
                        <span>{endDate ? new Date(endDate).toLocaleDateString() : new Date((timelineData as any).latestTimestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Clear Filters */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/summarize')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Clear All Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Content */}
          {analytics ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Events</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.totalEvents}</p>
                        <p className="text-sm text-blue-600 mt-1">Filtered results</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <FileText className="text-blue-600 h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Blocked Requests</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.blockedRequests}</p>
                        <p className="text-sm text-red-600 mt-1">{analytics.blockRate}% block rate</p>
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
                        <p className="text-3xl font-bold text-gray-900">{analytics.uniqueIPs}</p>
                        <p className="text-sm text-purple-600 mt-1">{analytics.avgEventsPerIP} avg/IP</p>
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
                        <p className="text-sm font-medium text-gray-600">Unique Users</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.uniqueUsers}</p>
                        <p className="text-sm text-green-600 mt-1">{analytics.avgEventsPerUser} avg/user</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-xl">
                        <AlertTriangle className="text-green-600 h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Time-Based Views */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Log Trends Over Time */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Log Trends Over Time</h3>
                    <p className="text-sm text-gray-600 mb-4">Traffic volume changes over time to identify potential DDoS attacks or abnormal activity</p>
                    <div className="h-64">
                      <LogTrendsChart data={(analytics as any).timeTrends} />
                    </div>
                  </CardContent>
                </Card>

                {/* Hourly/Daily/Weekly Patterns */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Traffic Patterns</h3>
                      <select 
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        value={patternView}
                        onChange={(e) => setPatternView(e.target.value as 'hourly' | 'daily' | 'weekly')}
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Traffic segmented by time periods to identify off-hours bot activity or credential stuffing</p>
                    <div className="h-64">
                      <TrafficPatternsChart data={(analytics as any).patterns[patternView]} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Categories and Response Times */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Top Categories */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories</h3>
                    <div className="space-y-3">
                      {analytics.topCategories.slice(0, 5).map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-900">{category.category || 'Uncategorized'}</span>
                            <div className="text-sm text-gray-600">{category.count} events</div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{category.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Response Time Stats */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time Analysis</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Average Response Time</span>
                        <span className="text-lg font-bold text-blue-600">{analytics.avgResponseTime}ms</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Minimum Response Time</span>
                        <span className="text-lg font-bold text-green-600">{analytics.minResponseTime}ms</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Maximum Response Time</span>
                        <span className="text-lg font-bold text-red-600">{analytics.maxResponseTime}ms</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : logsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics data...</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">No logs found matching the current filters. Try adjusting your filter criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Chart Components
function LogTrendsChart({ data }: { data: Array<{ time: string; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="time" 
          stroke="#666"
          fontSize={12}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          stroke="#666"
          fontSize={12}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #ccc',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          labelStyle={{ color: '#333' }}
        />
        <Line 
          type="monotone" 
          dataKey="count" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: 'white' }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

function TrafficPatternsChart({ data }: { data: Array<{ period: string; count: number; blocked: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="period" 
          stroke="#666"
          fontSize={12}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          stroke="#666"
          fontSize={12}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #ccc',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          labelStyle={{ color: '#333' }}
        />
        <Bar dataKey="count" fill="#3b82f6" name="Total Traffic" />
        <Bar dataKey="blocked" fill="#ef4444" name="Blocked" />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

// Analytics calculation function
function calculateAnalytics(logs: LogEntry[]) {
  const totalEvents = logs.length;
  const blockedRequests = logs.filter(log => log.action === 'BLOCK').length;
  const uniqueIPs = new Set(logs.map(log => log.sourceIp)).size;
  const uniqueUsers = new Set(logs.map(log => log.userId)).size;
  
  // Action distribution
  const actionCounts = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const actionDistribution = Object.entries(actionCounts).map(([action, count]) => ({
    action,
    count,
    percentage: Math.round((count / totalEvents) * 100)
  })).sort((a, b) => b.count - a.count);
  
  // Top source IPs
  const ipCounts = logs.reduce((acc, log) => {
    acc[log.sourceIp] = (acc[log.sourceIp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topSourceIPs = Object.entries(ipCounts).map(([sourceIp, count]) => ({
    sourceIp,
    count
  })).sort((a, b) => b.count - a.count);
  
  // Top categories
  const categoryCounts = logs.reduce((acc, log) => {
    const category = log.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topCategories = Object.entries(categoryCounts).map(([category, count]) => ({
    category,
    count,
    percentage: Math.round((count / totalEvents) * 100)
  })).sort((a, b) => b.count - a.count);
  
  // Response time stats
  const responseTimes = logs.filter(log => log.responseTime !== null).map(log => log.responseTime!);
  const avgResponseTime = responseTimes.length > 0 
    ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
    : 0;
  const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
  const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
  
  // Time-based analytics
  const timeTrends = generateTimeTrends(logs);
  const hourlyPatterns = generateHourlyPatterns(logs);
  const dailyPatterns = generateDailyPatterns(logs);
  const weeklyPatterns = generateWeeklyPatterns(logs);
  
  return {
    totalEvents,
    blockedRequests,
    blockRate: Math.round((blockedRequests / totalEvents) * 100),
    uniqueIPs,
    uniqueUsers,
    avgEventsPerIP: Math.round(totalEvents / uniqueIPs),
    avgEventsPerUser: Math.round(totalEvents / uniqueUsers),
    actionDistribution,
    topSourceIPs,
    topCategories,
    avgResponseTime,
    minResponseTime,
    maxResponseTime,
    timeTrends,
    patterns: {
      hourly: hourlyPatterns,
      daily: dailyPatterns,
      weekly: weeklyPatterns,
    },
  };
}

// Time trends generation (shows traffic over time)
function generateTimeTrends(logs: LogEntry[]) {
  if (logs.length === 0) return [];
  
  // Group logs by hour and keep track of actual timestamps for proper sorting
  const hourlyData = logs.reduce((acc, log) => {
    const logDate = new Date(log.timestamp);
    const hour = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), logDate.getHours());
    const hourKey = hour.toISOString();
    const displayTime = hour.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric' 
    });
    
    if (!acc[hourKey]) {
      acc[hourKey] = { time: displayTime, count: 0, sortKey: hour.getTime() };
    }
    acc[hourKey].count++;
    return acc;
  }, {} as Record<string, { time: string; count: number; sortKey: number }>);
  
  return Object.values(hourlyData)
    .sort((a, b) => a.sortKey - b.sortKey) // Sort by actual timestamp, earliest first
    .map(({ time, count }) => ({ time, count }));
}

// Hourly patterns (0-23 hours)
function generateHourlyPatterns(logs: LogEntry[]) {
  const hourlyData = new Array(24).fill(0).map((_, hour) => ({
    period: `${hour.toString().padStart(2, '0')}:00`,
    count: 0,
    blocked: 0,
  }));
  
  logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    hourlyData[hour].count++;
    if (log.action === 'BLOCK') {
      hourlyData[hour].blocked++;
    }
  });
  
  return hourlyData;
}

// Daily patterns (days of week)
function generateDailyPatterns(logs: LogEntry[]) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dailyData = days.map(day => ({ period: day, count: 0, blocked: 0 }));
  
  logs.forEach(log => {
    const dayIndex = new Date(log.timestamp).getDay();
    dailyData[dayIndex].count++;
    if (log.action === 'BLOCK') {
      dailyData[dayIndex].blocked++;
    }
  });
  
  return dailyData;
}

// Weekly patterns (weeks over time)
function generateWeeklyPatterns(logs: LogEntry[]) {
  if (logs.length === 0) return [];
  
  const weeklyData = logs.reduce((acc, log) => {
    const date = new Date(log.timestamp);
    const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
    const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (!acc[weekKey]) {
      acc[weekKey] = { period: weekKey, count: 0, blocked: 0 };
    }
    acc[weekKey].count++;
    if (log.action === 'BLOCK') {
      acc[weekKey].blocked++;
    }
    return acc;
  }, {} as Record<string, { period: string; count: number; blocked: number }>);
  
  return Object.values(weeklyData).sort((a, b) => 
    new Date(a.period).getTime() - new Date(b.period).getTime()
  );
}
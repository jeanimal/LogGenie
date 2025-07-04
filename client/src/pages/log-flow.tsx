import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Filter, ZoomIn, ZoomOut, Activity } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface LogFlowData {
  id: number;
  timestamp: string;
  sourceIp: string;
  destinationUrl: string;
  action: string;
  riskLevel: string;
  userAgent?: string;
  responseCode?: number;
  category?: string;
  x?: number;
  y?: number;
}

interface TimelineEvent {
  timestamp: string;
  count: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export default function LogFlow() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Animation and timeline state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [timeRange, setTimeRange] = useState("1h");
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<string[]>(["low", "medium", "high", "critical"]);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Data state
  const [flowData, setFlowData] = useState<LogFlowData[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineEvent[]>([]);
  const [visibleLogs, setVisibleLogs] = useState<LogFlowData[]>([]);
  
  // Animation refs
  const animationRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number>();

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

  // Fetch log data for visualization
  const { data: logs = [], isLoading: isLoadingLogs } = useQuery<LogFlowData[]>({
    queryKey: ["/api/logs/flow", timeRange],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/logs/flow?timeRange=${timeRange}`);
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Process logs for visualization
  useEffect(() => {
    if (logs.length > 0) {
      // Sort logs by timestamp
      const sortedLogs = [...logs].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Assign positions for visualization
      const processedLogs = sortedLogs.map((log, index) => ({
        ...log,
        x: Math.random() * 800 + 100, // Random x position
        y: Math.random() * 400 + 100, // Random y position
      }));
      
      setFlowData(processedLogs);
      
      // Generate timeline data
      const timeline = generateTimelineData(processedLogs);
      setTimelineData(timeline);
      
      // Reset animation
      setCurrentTime(0);
      setVisibleLogs([]);
    }
  }, [logs]);

  // Generate timeline data from logs
  const generateTimelineData = (logs: LogFlowData[]): TimelineEvent[] => {
    const timelineMap = new Map<string, TimelineEvent>();
    
    logs.forEach(log => {
      const timeKey = new Date(log.timestamp).toISOString().substring(0, 16); // Group by minute
      
      if (!timelineMap.has(timeKey)) {
        timelineMap.set(timeKey, {
          timestamp: timeKey,
          count: 0,
          riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
        });
      }
      
      const event = timelineMap.get(timeKey)!;
      event.count++;
      event.riskDistribution[log.riskLevel as keyof typeof event.riskDistribution]++;
    });
    
    return Array.from(timelineMap.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  // Animation loop
  useEffect(() => {
    if (isPlaying && flowData.length > 0) {
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = timestamp;
        }
        
        const elapsed = timestamp - startTimeRef.current;
        const progress = (elapsed * playbackSpeed) / 1000; // Convert to seconds
        
        // Update current time
        const newTime = Math.min(progress, flowData.length - 1);
        setCurrentTime(newTime);
        
        // Update visible logs based on timeline
        const currentTimestamp = new Date(flowData[0].timestamp).getTime() + (newTime * 1000);
        const visible = flowData.filter(log => 
          new Date(log.timestamp).getTime() <= currentTimestamp &&
          selectedRiskLevels.includes(log.riskLevel)
        );
        setVisibleLogs(visible);
        
        // Continue animation if not at end
        if (newTime < flowData.length - 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsPlaying(false);
          startTimeRef.current = undefined;
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      startTimeRef.current = undefined;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, flowData, playbackSpeed, selectedRiskLevels]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw connections between logs
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < visibleLogs.length - 1; i++) {
      const current = visibleLogs[i];
      const next = visibleLogs[i + 1];
      
      ctx.beginPath();
      ctx.moveTo(current.x!, current.y!);
      ctx.lineTo(next.x!, next.y!);
      ctx.stroke();
    }
    
    // Draw log points
    visibleLogs.forEach(log => {
      const riskColors = {
        low: '#22c55e',
        medium: '#f59e0b',
        high: '#ef4444',
        critical: '#dc2626'
      };
      
      ctx.fillStyle = riskColors[log.riskLevel as keyof typeof riskColors];
      ctx.beginPath();
      ctx.arc(log.x!, log.y!, 6 * zoomLevel, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add pulsing effect for recent logs
      const logTime = new Date(log.timestamp).getTime();
      const currentTimestamp = new Date(flowData[0]?.timestamp || 0).getTime() + (currentTime * 1000);
      
      if (currentTimestamp - logTime < 5000) { // Last 5 seconds
        ctx.strokeStyle = riskColors[log.riskLevel as keyof typeof riskColors];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(log.x!, log.y!, 12 * zoomLevel, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });
  }, [visibleLogs, currentTime, zoomLevel, flowData]);

  // Control functions
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setVisibleLogs([]);
    startTimeRef.current = undefined;
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * (flowData.length - 1);
    setCurrentTime(newTime);
    
    // Update visible logs
    const currentTimestamp = new Date(flowData[0]?.timestamp || 0).getTime() + (newTime * 1000);
    const visible = flowData.filter(log => 
      new Date(log.timestamp).getTime() <= currentTimestamp &&
      selectedRiskLevels.includes(log.riskLevel)
    );
    setVisibleLogs(visible);
  };

  const getRiskLevelColor = (level: string) => {
    const colors = {
      low: "bg-green-500",
      medium: "bg-yellow-500", 
      high: "bg-red-500",
      critical: "bg-red-600"
    };
    return colors[level as keyof typeof colors] || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Log Flow Visualization</h1>
          <p className="text-gray-600">Interactive timeline showing the flow of security events</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-gray-600">
            {visibleLogs.length} / {flowData.length} events
          </span>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Playback Controls</CardTitle>
          <CardDescription>Control the animation and filter events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playback buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePlayPause}
              variant={isPlaying ? "secondary" : "default"}
              size="sm"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          {/* Speed control */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Playback Speed: {playbackSpeed}x</label>
            <Slider
              value={[playbackSpeed]}
              onValueChange={(value) => setPlaybackSpeed(value[0])}
              min={0.1}
              max={5}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Time range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Time Range</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Risk level filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Risk Levels</label>
            <div className="flex flex-wrap gap-2">
              {["low", "medium", "high", "critical"].map(level => (
                <Badge
                  key={level}
                  variant={selectedRiskLevels.includes(level) ? "default" : "outline"}
                  className={`cursor-pointer ${selectedRiskLevels.includes(level) ? getRiskLevelColor(level) : ""}`}
                  onClick={() => {
                    if (selectedRiskLevels.includes(level)) {
                      setSelectedRiskLevels(selectedRiskLevels.filter(l => l !== level));
                    } else {
                      setSelectedRiskLevels([...selectedRiskLevels, level]);
                    }
                  }}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Zoom control */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
              variant="outline"
              size="sm"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-16 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))}
              variant="outline"
              size="sm"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visualization Canvas */}
      <Card>
        <CardHeader>
          <CardTitle>Flow Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg bg-gray-50 p-4">
            <canvas
              ref={canvasRef}
              width={1000}
              height={500}
              className="w-full h-auto border rounded"
              style={{ maxHeight: '500px' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interactive Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Timeline</CardTitle>
          <CardDescription>Click on the timeline to jump to specific moments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Timeline bar */}
            <div
              className="relative h-16 bg-gray-100 rounded-lg cursor-pointer overflow-hidden"
              onClick={handleTimelineClick}
            >
              {/* Timeline progress */}
              <div
                className="absolute top-0 left-0 h-full bg-blue-200 transition-all duration-100"
                style={{ width: `${(currentTime / Math.max(flowData.length - 1, 1)) * 100}%` }}
              />
              
              {/* Timeline events */}
              {timelineData.map((event, index) => {
                const position = (index / Math.max(timelineData.length - 1, 1)) * 100;
                const height = Math.min((event.count / Math.max(...timelineData.map(e => e.count))) * 100, 100);
                
                return (
                  <div
                    key={index}
                    className="absolute bottom-0 bg-blue-500 opacity-70 hover:opacity-100 transition-opacity"
                    style={{
                      left: `${position}%`,
                      width: '2px',
                      height: `${height}%`,
                      minHeight: '4px'
                    }}
                    title={`${event.count} events at ${new Date(event.timestamp).toLocaleTimeString()}`}
                  />
                );
              })}
              
              {/* Current time indicator */}
              <div
                className="absolute top-0 w-1 h-full bg-red-500 shadow-lg"
                style={{ left: `${(currentTime / Math.max(flowData.length - 1, 1)) * 100}%` }}
              />
            </div>

            {/* Timeline info */}
            <div className="text-sm text-gray-600">
              {flowData.length > 0 && (
                <div className="flex justify-between">
                  <span>{new Date(flowData[0].timestamp).toLocaleString()}</span>
                  <span>Current: {new Date(flowData[0].timestamp).getTime() + (currentTime * 1000) > 0 ? 
                    new Date(new Date(flowData[0].timestamp).getTime() + (currentTime * 1000)).toLocaleString() : 
                    'Start'}</span>
                  <span>{new Date(flowData[flowData.length - 1]?.timestamp || 0).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{flowData.length}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{visibleLogs.length}</div>
            <div className="text-sm text-gray-600">Visible Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {visibleLogs.filter(log => log.riskLevel === 'high' || log.riskLevel === 'critical').length}
            </div>
            <div className="text-sm text-gray-600">High Risk Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(visibleLogs.map(log => log.sourceIp)).size}
            </div>
            <div className="text-sm text-gray-600">Unique IPs</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
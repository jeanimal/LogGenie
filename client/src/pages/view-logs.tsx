import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
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
import { Search, Calendar, Clock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";

// Define log data type
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

export default function ViewLogs() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());

  // Get filter values from URL or use defaults
  const companyFilter = searchParams.get('company') || 'all';
  const timelineStart = parseInt(searchParams.get('timelineStart') || '0');
  const timelineEnd = parseInt(searchParams.get('timelineEnd') || '100');
  const timelineRange: [number, number] = [timelineStart, timelineEnd];
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

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
    queryKey: ["/api/logs", 1, 1000, companyFilter === "all" ? "" : companyFilter, startDate, endDate],
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
        endDate: endDateObj.toISOString()
      });
    }
  };

  // Update timeline when slider changes
  useEffect(() => {
    updateDateRange(timelineRange);
  }, [timelineRange, timelineData]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "BLOCK":
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">BLOCK</Badge>;
      case "ALLOW":
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">ALLOW</Badge>;
      case "FLAGGED":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">FLAGGED</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  // TanStack Table column definitions
  const columnHelper = createColumnHelper<LogEntry>();
  
  const columns = useMemo<ColumnDef<LogEntry, any>[]>(() => [
    columnHelper.accessor('timestamp', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Timestamp
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ getValue }) => formatTimestamp(getValue() as string),
      filterFn: 'includesString',
    }),
    columnHelper.accessor('sourceIp', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Source IP
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ getValue }) => <span className="text-sm text-gray-900">{getValue() as string}</span>,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('userId', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          User ID
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ getValue }) => <span className="text-sm text-gray-900">{getValue() as string}</span>,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('destinationUrl', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Destination
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ getValue }) => <span className="text-sm text-gray-900">{getValue() as string}</span>,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('action', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Action
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ getValue }) => getActionBadge(getValue() as string),
      filterFn: 'equalsString',
    }),
    columnHelper.accessor('category', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Category
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ getValue }) => <span className="text-sm text-gray-900">{(getValue() as string) || 'N/A'}</span>,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('responseTime', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Response Time
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ getValue }) => {
        const value = getValue() as number | null;
        return <span className="text-sm text-gray-900">{value ? `${value}ms` : 'N/A'}</span>;
      },
      filterFn: 'includesString',
    }),
  ], []);

  // TanStack Table instance with pagination
  const table = useReactTable({
    data: (logsData as any)?.logs || [],
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">View Security Logs</h1>
              <p className="text-gray-600">Browse and analyze uploaded security log entries</p>
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

          {/* Global Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search all columns..."
                  value={globalFilter ?? ""}
                  onChange={(event) => setGlobalFilter(String(event.target.value))}
                  className="max-w-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Logs Table with TanStack */}
          <Card>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading logs...</p>
                </div>
              ) : (
                <>
                  {/* Column Filters */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                      {table.getHeaderGroups()[0]?.headers.map((header) => (
                        <div key={header.id} className="space-y-1">
                          <Label className="text-xs font-medium text-gray-600">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </Label>
                          {header.column.getCanFilter() && (
                            <Input
                              placeholder={`Filter...`}
                              value={(header.column.getFilterValue() ?? "") as string}
                              onChange={(event) =>
                                header.column.setFilterValue(event.target.value)
                              }
                              className="h-8 text-xs"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id} className="text-left">
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {table.getRowModel().rows?.length ? (
                          table.getRowModel().rows.map((row) => (
                            <TableRow
                              key={row.id}
                              data-state={row.getIsSelected() && "selected"}
                              className="hover:bg-gray-50"
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={columns.length}
                              className="h-24 text-center"
                            >
                              No results found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Table Info */}
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="text-sm text-gray-700">
                      Showing {table.getFilteredRowModel().rows.length} of {(logsData as any)?.logs?.length || 0} logs
                      {(table.getState().columnFilters.length > 0 || table.getState().globalFilter) && 
                        " (filtered)"
                      }
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

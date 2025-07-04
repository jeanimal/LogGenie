import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload as UploadIcon, CloudUpload } from "lucide-react";

export default function Upload() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [company, setCompany] = useState<string>("");
  const [logType, setLogType] = useState<string>("");
  const [format, setFormat] = useState<string>("csv");

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

  // Set default values when data loads
  useEffect(() => {
    if (companies && companies.length > 0 && !company) {
      const devCompany = companies.find((c: any) => c.name === "dev");
      if (devCompany) {
        setCompany(devCompany.id.toString());
      }
    }
  }, [companies, company]);

  useEffect(() => {
    if (logTypes && logTypes.length > 0 && !logType) {
      const zscalerType = logTypes.find((t: any) => t.name === "ZScaler Web Proxy Log");
      if (zscalerType) {
        setLogType(zscalerType.id.toString());
      }
    }
  }, [logTypes, logType]);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest("POST", "/api/upload", formData);
    },
    onSuccess: (response) => {
      toast({
        title: "Upload Successful",
        description: "Your log file has been uploaded and processed successfully.",
      });
      setSelectedFile(null);
      // Reset form
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
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
        title: "Upload Failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!company || !logType) {
      toast({
        title: "Missing Information",
        description: "Please select company and log type.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("company", company);
    formData.append("logType", logType);
    formData.append("format", format);

    uploadMutation.mutate(formData);
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Security Logs</h1>
            <p className="text-gray-600">Upload log files for cybersecurity analysis and threat detection</p>
          </div>

          <Card>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Selection */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Company</Label>
                  <Select value={company} onValueChange={setCompany}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((comp: any) => (
                        <SelectItem key={comp.id} value={comp.id.toString()}>
                          {comp.name} {comp.name === "dev" && "(Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Log Type Selection */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Log Type</Label>
                  <Select value={logType} onValueChange={setLogType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select log type" />
                    </SelectTrigger>
                    <SelectContent>
                      {logTypes?.map((type: any) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Log Format Selection */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Log Format</Label>
                  <RadioGroup value={format} onValueChange={setFormat} className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="csv" id="csv" />
                      <div className="ml-3">
                        <Label htmlFor="csv" className="text-sm font-medium text-gray-900 cursor-pointer">
                          CSV Format
                        </Label>
                        <div className="text-xs text-gray-500">Comma-separated values</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="txt" id="txt" />
                      <div className="ml-3">
                        <Label htmlFor="txt" className="text-sm font-medium text-gray-900 cursor-pointer">
                          TXT Format
                        </Label>
                        <div className="text-xs text-gray-500">Plain text file</div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* File Upload */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Log File</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition duration-200">
                    <input
                      type="file"
                      className="hidden"
                      id="file-upload"
                      accept=".csv,.txt"
                      onChange={handleFileSelect}
                    />
                    <div className="space-y-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
                        <CloudUpload className="text-gray-400 text-2xl h-8 w-8" />
                      </div>
                      <div>
                        <Label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-primary font-medium hover:text-blue-700">
                            Click to upload
                          </span>
                          <span className="text-gray-500"> or drag and drop</span>
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">CSV or TXT files up to 10MB</p>
                        {selectedFile && (
                          <p className="text-sm text-green-600 mt-2">
                            Selected: {selectedFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploadMutation.isPending || !selectedFile}
                    className="bg-primary hover:bg-blue-700 text-white"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="mr-2 h-4 w-4" />
                        Upload Log File
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Info } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-blue-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
              <Shield className="text-white text-2xl" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">LogGenie</h1>
            <p className="text-gray-600">Cybersecurity Log Analysis Platform</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security Analyst Access
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Button
                  onClick={handleLogin}
                  className="w-full bg-primary hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
                >
                  <span>Sign in with Replit Auth</span>
                </Button>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="text-blue-500 mt-0.5 h-4 w-4" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Default Access</p>
                  <p>All users login to the "dev" company environment by default.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            Secure • Professional • Efficient
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

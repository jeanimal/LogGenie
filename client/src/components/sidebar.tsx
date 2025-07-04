import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Shield,
  BarChart3,
  Upload,
  FileText,
  BarChart,
  Search,
  User,
  LogOut,
  Activity,
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Upload Logs", href: "/upload", icon: Upload },
    { name: "View Logs", href: "/view", icon: FileText },
    { name: "Summarize", href: "/summarize", icon: BarChart },
    { name: "Detect Anomalies", href: "/detect", icon: Search },
    { name: "Log Flow", href: "/flow", icon: Activity },
  ];

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50">
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
          <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
            <Shield className="text-white h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">LogGenie</h1>
            <p className="text-xs text-gray-500">Security Analytics</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition duration-200 cursor-pointer ${
                  isActive(item.href)
                    ? "text-primary bg-blue-50"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="text-gray-600 text-sm h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Security Analyst"}
              </p>
              <p className="text-xs text-gray-500">dev company</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

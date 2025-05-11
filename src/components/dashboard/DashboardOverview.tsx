
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { hiresApi } from "@/services/api";
import { NewHire } from "@/types/types";
import { BarChart } from "recharts";
import { BarChart as BarChartIcon, Users, CheckCircle, Clock, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
}

const StatsCard = ({ title, value, description, icon, trend }: StatsCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="h-9 w-9 rounded-lg bg-audit-blue/10 flex items-center justify-center text-audit-blue">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {trend && (
        <div className="mt-2 flex items-center text-xs">
          <span className={trend.value >= 0 ? "text-green-500" : "text-red-500"}>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
          <span className="ml-1 text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

export function DashboardOverview() {
  const [hires, setHires] = useState<NewHire[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await hiresApi.getAll();
        setHires(data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate metrics
  const totalHires = hires.length;
  const completedSetups = hires.filter(hire => 
    hire.account_creation_status === "Done" && 
    hire.laptop_ready === "Ready" || hire.laptop_ready === "Done"
  ).length;
  const pendingSetups = totalHires - completedSetups;
  const percentComplete = totalHires > 0 ? Math.round((completedSetups / totalHires) * 100) : 0;

  // Calculate upcoming onboarding in next 7 days
  const now = new Date();
  const next7Days = new Date(now);
  next7Days.setDate(now.getDate() + 7);
  
  const upcomingOnboarding = hires.filter(hire => {
    const onSiteDate = new Date(hire.on_site_date);
    return onSiteDate >= now && onSiteDate <= next7Days;
  }).length;

  // Department distribution
  const departments: Record<string, number> = {};
  hires.forEach(hire => {
    departments[hire.department] = (departments[hire.department] || 0) + 1;
  });
  
  // Sort by number of hires
  const topDepartments = Object.entries(departments)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (isLoading) {
    return <div className="text-center py-8">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total New Hires"
          value={totalHires}
          description="Total records in audit log"
          icon={<Users className="h-5 w-5" />}
        />
        <StatsCard
          title="Setup Complete"
          value={completedSetups}
          description="Accounts and equipment ready"
          icon={<CheckCircle className="h-5 w-5" />}
          trend={{ value: percentComplete, label: "completion rate" }}
        />
        <StatsCard
          title="Pending Setup"
          value={pendingSetups}
          description="Awaiting completion"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatsCard
          title="Upcoming Onboarding"
          value={upcomingOnboarding}
          description="Starting within 7 days"
          icon={<CalendarDays className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Progress</CardTitle>
            <CardDescription>Overall completion status of new hire setups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Overall Completion</p>
                  <p className="text-xs text-muted-foreground">Accounts and equipment</p>
                </div>
                <span className="text-lg font-bold">{percentComplete}%</span>
              </div>
              <Progress value={percentComplete} className="h-2" />
              
              <div className="pt-4 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Accounts Created</span>
                    <span className="font-medium">
                      {hires.filter(h => h.account_creation_status === "Done").length}/{totalHires}
                    </span>
                  </div>
                  <Progress 
                    value={totalHires > 0 ? 
                      (hires.filter(h => h.account_creation_status === "Done").length / totalHires) * 100 : 0
                    } 
                    className="h-1"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Laptops Ready</span>
                    <span className="font-medium">
                      {hires.filter(h => h.laptop_ready === "Ready" || h.laptop_ready === "Done").length}/{totalHires}
                    </span>
                  </div>
                  <Progress 
                    value={totalHires > 0 ? 
                      (hires.filter(h => h.laptop_ready === "Ready" || h.laptop_ready === "Done").length / totalHires) * 100 : 0
                    } 
                    className="h-1"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Licenses Assigned</span>
                    <span className="font-medium">
                      {hires.filter(h => h.license_assigned).length}/{totalHires}
                    </span>
                  </div>
                  <Progress 
                    value={totalHires > 0 ? (hires.filter(h => h.license_assigned).length / totalHires) * 100 : 0} 
                    className="h-1"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>M365 Licenses</span>
                    <span className="font-medium">
                      {hires.filter(h => h.microsoft_365_license && h.microsoft_365_license !== "None").length}/{totalHires}
                    </span>
                  </div>
                  <Progress 
                    value={totalHires > 0 ? (hires.filter(h => h.microsoft_365_license && h.microsoft_365_license !== "None").length / totalHires) * 100 : 0} 
                    className="h-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
            <CardDescription>New hires by department</CardDescription>
          </CardHeader>
          <CardContent>
            {topDepartments.length > 0 ? (
              <div className="space-y-4">
                {topDepartments.map(([dept, count]) => (
                  <div key={dept} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{dept}</span>
                      <span>{count} hires</span>
                    </div>
                    <Progress 
                      value={(count / totalHires) * 100} 
                      className="h-2" 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <BarChartIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No department data available</p>
                <p className="text-sm mt-1">Import data to see statistics</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Hires</CardTitle>
              <CardDescription>Latest additions to the audit log</CardDescription>
            </div>
            <Link to="/hires">
              <Button variant="outline" className="h-8">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {hires.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-2 text-left font-medium">Name</th>
                    <th className="py-3 px-2 text-left font-medium">Department</th>
                    <th className="py-3 px-2 text-left font-medium">Start Date</th>
                    <th className="py-3 px-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hires.slice(0, 5).map((hire) => (
                    <tr key={hire.id} className="border-b">
                      <td className="py-3 px-2 font-medium">{hire.name}</td>
                      <td className="py-3 px-2">{hire.department}</td>
                      <td className="py-3 px-2">{new Date(hire.on_site_date).toLocaleDateString()}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          hire.account_creation_status === "Done" ? 
                            "bg-green-100 text-green-800" : 
                            "bg-yellow-100 text-yellow-800"
                        }`}>
                          {hire.account_creation_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No hire data available</p>
              <div className="flex justify-center mt-4">
                <Link to="/import">
                  <Button>Import Data</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Fixing the TypeScript error by properly declaring missing Button component
const Button = ({ children, variant, className, onClick, disabled }:
  { 
    children: React.ReactNode; 
    variant?: string; 
    className?: string; 
    onClick?: () => void;
    disabled?: boolean;
  }) => {
  return (
    <button 
      className={`px-4 py-2 rounded-md ${
        variant === "outline" 
          ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground" 
          : "bg-audit-blue text-white hover:bg-audit-lightBlue"
      } ${className || ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

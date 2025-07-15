
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { hiresApi } from "@/services/api";
import { NewHire } from "@/types/types";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, FunnelChart, Funnel, LabelList
} from "recharts";
import { 
  BarChart as BarChartIcon, Users, CheckCircle, Clock, CalendarDays, 
  TrendingUp, TrendingDown, AlertTriangle, Target, Zap, Award,
  Download, Filter, RefreshCw, Eye, EyeOff
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";

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

// Color schemes for enhanced visualization
const COLORS = {
  primary: ['#3b82f6', '#1d4ed8', '#1e40af', '#1e3a8a'],
  success: ['#10b981', '#059669', '#047857', '#065f46'],
  warning: ['#f59e0b', '#d97706', '#b45309', '#92400e'],
  danger: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'],
  neutral: ['#6b7280', '#4b5563', '#374151', '#1f2937']
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export function DashboardOverview() {
  const [hires, setHires] = useState<NewHire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(true);

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

  // Use centralized dashboard metrics hook
  const metrics = useDashboardMetrics(hires);
  
  // Destructure metrics for easier access
  const {
    totalHires,
    completedSetups,
    pendingSetups,
    percentComplete,
    averageProgress,
    accountsCreated,
    laptopsReady,
    licensesAssigned,
    m365Licenses,
    recentHires,
    upcomingOnboarding,
    avgCompletionTime,
    bottleneckMetric,
    departmentData,
    insights
  } = metrics;

  // Time-based analytics for component use
  const now = new Date();
  const next7Days = new Date(now);
  next7Days.setDate(now.getDate() + 7);

  // Department data for charts
  const topDepartments = departmentData
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (isLoading) {
    return <div className="text-center py-8">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm md:text-base">Monitor onboarding progress and hiring analytics</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'overview' ? 'default' : 'ghost'}
              onClick={() => setViewMode('overview')}
              className="h-8"
            >
              Overview
            </Button>
            <Button
              variant={viewMode === 'detailed' ? 'default' : 'ghost'}
              onClick={() => setViewMode('detailed')}
              className="h-8"
            >
              Detailed
            </Button>
          </div>
          <Button
            variant={showInsights ? 'default' : 'outline'}
            onClick={() => setShowInsights(!showInsights)}
            className="h-8"
            aria-label={showInsights ? 'Hide insights' : 'Show insights'}
          >
            {showInsights ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline ml-1">Smart Insights</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-8"
            aria-label="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Refresh</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-8"
            aria-label="Export data"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Export</span>
          </Button>
        </div>
      </div>

      {/* Smart Insights Panel */}
      {showInsights && insights.length > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Smart Insights
            </CardTitle>
            <CardDescription>AI-powered recommendations based on your data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  insight.type === 'success' ? 'bg-green-50 border-l-green-500 text-green-800' :
                  insight.type === 'warning' ? 'bg-yellow-50 border-l-yellow-500 text-yellow-800' :
                  insight.type === 'alert' ? 'bg-red-50 border-l-red-500 text-red-800' :
                  insight.type === 'trend' ? 'bg-purple-50 border-l-purple-500 text-purple-800' :
                  'bg-blue-50 border-l-blue-500 text-blue-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {insight.type === 'success' && <Award className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    {insight.type === 'alert' && <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    {insight.type === 'trend' && <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    {insight.type === 'info' && <Target className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    <p className="text-sm font-medium">{insight.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
          title="Pending  Setup"
          value={pendingSetups}
          description="Awaiting completion"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatsCard
          title="Average Progress"
          value={`${averageProgress}%`}
          description="Across all new hires"
          icon={<BarChartIcon className="h-5 w-5" />}
          trend={{ value: averageProgress >= 70 ? averageProgress - 60 : averageProgress - 70, label: "vs target" }}
        />
        <StatsCard
          title="Upcoming Onboarding"
          value={upcomingOnboarding}
          description="Starting within 7 days"
          icon={<CalendarDays className="h-5 w-5" />}
        />
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Onboarding Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Onboarding Progress</CardTitle>
                <CardDescription>Multi-view completion analytics</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedMetric === 'bar' ? 'default' : 'outline'}
                  onClick={() => setSelectedMetric(selectedMetric === 'bar' ? null : 'bar')}
                  className="h-8"
                >
                  Bar
                </Button>
                <Button
                  variant={selectedMetric === 'pie' ? 'default' : 'outline'}
                  onClick={() => setSelectedMetric(selectedMetric === 'pie' ? null : 'pie')}
                  className="h-8"
                >
                  Pie
                </Button>
                <Button
                  variant={selectedMetric === 'funnel' ? 'default' : 'outline'}
                  onClick={() => setSelectedMetric(selectedMetric === 'funnel' ? null : 'funnel')}
                  className="h-8"
                >
                  Funnel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{percentComplete}%</div>
                  <div className="text-xs text-blue-600">Overall</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{Math.round(accountsCreated/totalHires*100) || 0}%</div>
                  <div className="text-xs text-green-600">Accounts</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{Math.round(laptopsReady/totalHires*100) || 0}%</div>
                  <div className="text-xs text-orange-600">Laptops</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{Math.round(licensesAssigned/totalHires*100) || 0}%</div>
                  <div className="text-xs text-purple-600">Licenses</div>
                </div>
              </div>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {(!selectedMetric || selectedMetric === 'bar') ? (
                    <BarChart
                      data={[
                        { name: "Accounts", value: Math.round(accountsCreated/totalHires*100) || 0, completed: accountsCreated, total: totalHires },
                        { name: "Laptops", value: Math.round(laptopsReady/totalHires*100) || 0, completed: laptopsReady, total: totalHires },
                        { name: "Licenses", value: Math.round(licensesAssigned/totalHires*100) || 0, completed: licensesAssigned, total: totalHires },
                        { name: "M365", value: Math.round(m365Licenses/totalHires*100) || 0, completed: m365Licenses, total: totalHires },
                        { name: "Overall", value: percentComplete, completed: completedSetups, total: totalHires }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value: number, name: string, props: { payload: { completed: number; total: number } }) => [
                          `${props.payload.completed}/${props.payload.total} (${value}%)`, 'Progress'
                        ]}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {CHART_COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : selectedMetric === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Accounts Created", value: accountsCreated, color: CHART_COLORS[0] },
                          { name: "Laptops Ready", value: laptopsReady, color: CHART_COLORS[1] },
                          { name: "Licenses Assigned", value: licensesAssigned, color: CHART_COLORS[2] },
                          { name: "M365 Licenses", value: m365Licenses, color: CHART_COLORS[3] }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {CHART_COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  ) : (
                    <BarChart
                      layout="horizontal"
                      data={[
                        { name: "Total Hires", value: totalHires, percentage: 100 },
                        { name: "Accounts Created", value: accountsCreated, percentage: Math.round(accountsCreated/totalHires*100) },
                        { name: "Laptops Ready", value: laptopsReady, percentage: Math.round(laptopsReady/totalHires*100) },
                        { name: "Licenses Assigned", value: licensesAssigned, percentage: Math.round(licensesAssigned/totalHires*100) },
                        { name: "Fully Complete", value: completedSetups, percentage: percentComplete }
                      ]}
                      margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip formatter={(value: number, name: string, props: { payload: { value: number } }) => [`${props.payload.value} (${value}%)`, 'Progress']} />
                      <Bar dataKey="percentage" fill="#3b82f6" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Indicators */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="text-sm text-muted-foreground">{percentComplete}%</span>
                </div>
                <Progress value={percentComplete} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Target: 85%</span>
                  <span className={percentComplete >= 85 ? 'text-green-600' : 'text-orange-600'}>
                    {percentComplete >= 85 ? '✓ On Track' : '⚠ Below Target'}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Bottleneck Score</span>
                  <span className="text-sm text-muted-foreground">{Math.round(bottleneckMetric)}%</span>
                </div>
                <Progress value={bottleneckMetric} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Optimal: {'>'}80%</span>
                  <span className={bottleneckMetric >= 80 ? 'text-green-600' : 'text-red-600'}>
                    {bottleneckMetric >= 80 ? '✓ Smooth' : '⚠ Bottleneck'}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Average Progress</span>
                  <span className="text-sm text-muted-foreground">{averageProgress}%</span>
                </div>
                <Progress value={averageProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Target: ≥70%</span>
                  <span className={averageProgress >= 70 ? 'text-green-600' : 'text-orange-600'}>
                    {averageProgress >= 70 ? '✓ On Track' : '⚠ Below Target'}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Avg. Completion Time</span>
                  <span className="text-sm text-muted-foreground">{avgCompletionTime} days</span>
                </div>
                <Progress value={Math.min(avgCompletionTime / 10 * 100, 100)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Target: ≤5 days</span>
                  <span className={avgCompletionTime <= 5 ? 'text-green-600' : 'text-orange-600'}>
                    {avgCompletionTime <= 5 ? '✓ Fast' : '⚠ Slow'}
                  </span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Recent Activity</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>New Hires (30d)</span>
                    <span className="font-medium">{recentHires}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Upcoming (7d)</span>
                    <span className="font-medium">{upcomingOnboarding}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Completion Rate</span>
                    <span className={`font-medium ${
                      percentComplete >= 90 ? 'text-green-600' :
                      percentComplete >= 70 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {percentComplete >= 90 ? 'Excellent' :
                       percentComplete >= 70 ? 'Good' : 'Needs Attention'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Enhanced Department Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Department Analytics</CardTitle>
            <CardDescription>Hiring distribution and completion rates by department</CardDescription>
          </CardHeader>
          <CardContent>
            {topDepartments.length > 0 ? (
              <div className="space-y-6">
                {/* Department Pie Chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topDepartments.map((data, index) => ({
                          name: data.name,
                          value: data.count,
                          completed: data.completed,
                          pending: data.pending,
                          color: CHART_COLORS[index % CHART_COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {topDepartments.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string, props: { payload: { completed: number; pending: number } }) => [
                        `${value} hires (${props.payload.completed} completed, ${props.payload.pending} pending)`, name
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Department Details */}
                <div className="space-y-3">
                  {departmentData.slice(0, 6).map((data, index) => {
                    const completionRate = data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0;
                    return (
                      <div key={data.name} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <span className="font-medium text-sm">{data.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{data.count} hires</div>
                            <div className={`text-xs ${
                              completionRate >= 80 ? 'text-green-600' :
                              completionRate >= 60 ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {completionRate}% complete
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-center p-1 bg-green-50 rounded">
                            <div className="font-medium text-green-700">{data.completed}</div>
                            <div className="text-green-600">Done</div>
                          </div>
                          <div className="text-center p-1 bg-orange-50 rounded">
                            <div className="font-medium text-orange-700">{data.pending}</div>
                            <div className="text-orange-600">Pending</div>
                          </div>
                        </div>
                        <Progress value={completionRate} className="h-1 mt-2" />
                      </div>
                    );
                  })}
                </div>
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

      {/* Enhanced Recent Hires Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Hires</CardTitle>
              <CardDescription>Latest additions with completion tracking</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-8">
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
              <Button variant="outline" className="h-8">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Link to="/hires">
                <Button variant="outline" className="h-8">View All</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hires.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{totalHires}</div>
                  <div className="text-xs text-gray-600">Total Hires</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{completedSetups}</div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{pendingSetups}</div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{upcomingOnboarding}</div>
                  <div className="text-xs text-gray-600">Upcoming</div>
                </div>
              </div>
              
              {/* Enhanced Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-3 px-3 text-left font-medium">Employee</th>
                      <th className="py-3 px-3 text-left font-medium">Department</th>
                      <th className="py-3 px-3 text-left font-medium">Start Date</th>
                      <th className="py-3 px-3 text-left font-medium">Progress</th>
                      <th className="py-3 px-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hires.slice(0, 8).map((hire) => {
                      const progress = [
                        hire.account_creation_status === "Active",
                        hire.laptop_ready === "Ready" || hire.laptop_ready === "Done",
                        hire.license_assigned,
                        hire.microsoft_365_license && hire.microsoft_365_license !== "None"
                      ];
                      const completedSteps = progress.filter(Boolean).length;
                      const progressPercentage = (completedSteps / progress.length) * 100;
                      
                      return (
                        <tr key={hire.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3">
                            <div>
                              <div className="font-medium">{hire.name}</div>
                              <div className="text-xs text-gray-500">{hire.email || 'No email'}</div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {hire.department}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div>
                              <div className="font-medium">{new Date(hire.on_site_date).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-500">
                                {Math.ceil((new Date(hire.on_site_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Progress value={progressPercentage} className="h-2 flex-1" />
                                <span className="text-xs font-medium">{completedSteps}/4</span>
                              </div>
                              <div className="flex gap-1">
                                {progress.map((completed, index) => (
                                  <div
                                    key={index}
                                    className={`w-2 h-2 rounded-full ${
                                      completed ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                                    title={['Account', 'Laptop', 'License', 'M365'][index]}
                                  />
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${
                                progressPercentage === 100 ? "bg-green-100 text-green-800" :
                                progressPercentage >= 75 ? "bg-blue-100 text-blue-800" :
                                progressPercentage >= 50 ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              }`}>
                                {progressPercentage === 100 ? "Complete" :
                                 progressPercentage >= 75 ? "Almost Done" :
                                 progressPercentage >= 50 ? "In Progress" :
                                 "Just Started"}
                              </span>
                              {upcomingOnboarding > 0 && new Date(hire.on_site_date) <= next7Days && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                                  Upcoming
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {hires.length > 8 && (
                <div className="text-center pt-4">
                  <Link to="/hires">
                    <Button variant="outline">
                      View All {hires.length} Hires
                    </Button>
                  </Link>
                </div>
              )}
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

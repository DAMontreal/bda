import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getDisciplineLabel, getTrocCategoryLabel } from "@/lib/utils";
import { User, Event, TrocAd } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface AnalyticsData {
  counts: {
    totalUsers: number;
    approvedUsers: number;
    pendingUsers: number;
    events: number;
    trocAds: number;
  };
  distribution: {
    usersByDiscipline: Record<string, number>;
    usersByLocation: Record<string, number>;
    adsByCategory: Record<string, number>;
  };
  recent: {
    users: User[];
    events: Event[];
    ads: TrocAd[];
  };
}

const COLORS = ['#F89720', '#FAA83C', '#FBBA5D', '#FCCC7D', '#FDDE9E', '#FEEFBE', '#FFF7E6', '#F9A642', '#F7B564', '#F5C486'];

const AnalyticsDashboard = () => {
  const { data, isLoading, isError, refetch } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-dam-orange" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center p-8 border border-red-200 rounded-lg">
        <p className="text-red-500">Une erreur est survenue lors du chargement des statistiques</p>
      </div>
    );
  }

  // Prepare data for charts
  const disciplineChartData = Object.entries(data.distribution.usersByDiscipline).map(([key, value]) => ({
    name: getDisciplineLabel(key),
    value
  }));

  const locationChartData = Object.entries(data.distribution.usersByLocation).map(([key, value]) => ({
    name: key,
    value
  }));

  const categoryChartData = Object.entries(data.distribution.adsByCategory).map(([key, value]) => ({
    name: getTrocCategoryLabel(key),
    value
  }));

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Total des Artistes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-dam-orange">{data.counts.totalUsers}</div>
            <p className="text-xs text-gray-500 mt-1">
              {data.counts.approvedUsers} approuvés, {data.counts.pendingUsers} en attente
            </p>
            <Progress 
              className="h-2 mt-3" 
              value={(data.counts.approvedUsers / (data.counts.totalUsers || 1)) * 100} 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Artistes en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-dam-orange">{data.counts.pendingUsers}</div>
            <p className="text-xs text-gray-500 mt-1">
              En attente d'approbation
            </p>
            <Progress 
              className="h-2 mt-3" 
              value={(data.counts.pendingUsers / (data.counts.totalUsers || 1)) * 100} 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Événements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-dam-orange">{data.counts.events}</div>
            <p className="text-xs text-gray-500 mt-1">
              Événements publiés
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Annonces TROC'DAM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-dam-orange">{data.counts.trocAds}</div>
            <p className="text-xs text-gray-500 mt-1">
              Annonces publiées
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-dam-orange">
              {data.counts.totalUsers ? Math.round((data.counts.approvedUsers / data.counts.totalUsers) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Profils approuvés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <Tabs defaultValue="disciplines">
        <TabsList className="mb-6">
          <TabsTrigger value="disciplines">Disciplines</TabsTrigger>
          <TabsTrigger value="locations">Localisation</TabsTrigger>
          <TabsTrigger value="categories">Catégories TROC'DAM</TabsTrigger>
        </TabsList>
        
        <TabsContent value="disciplines">
          <Card className="p-6">
            <CardTitle className="mb-6">Distribution par discipline</CardTitle>
            {disciplineChartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={disciplineChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#F89720" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed border-gray-300 rounded">
                <p className="text-gray-400">Aucune donnée disponible</p>
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="locations">
          <Card className="p-6">
            <CardTitle className="mb-6">Distribution par localisation</CardTitle>
            {locationChartData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={locationChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#F89720" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={locationChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {locationChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed border-gray-300 rounded">
                <p className="text-gray-400">Aucune donnée disponible</p>
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="categories">
          <Card className="p-6">
            <CardTitle className="mb-6">Distribution par catégorie d'annonce</CardTitle>
            {categoryChartData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#F89720" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed border-gray-300 rounded">
                <p className="text-gray-400">Aucune donnée disponible</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users">
            <TabsList className="mb-4">
              <TabsTrigger value="users">Nouveaux Artistes</TabsTrigger>
              <TabsTrigger value="events">Événements</TabsTrigger>
              <TabsTrigger value="ads">Annonces TROC'DAM</TabsTrigger>
            </TabsList>
            
            <TabsContent value="users">
              {data.recent.users.length > 0 ? (
                <div className="space-y-4">
                  {data.recent.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-500">{user.discipline ? getDisciplineLabel(user.discipline) : "Non spécifié"}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(user.createdAt || new Date()).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed border-gray-300 rounded">
                  <p className="text-gray-400">Aucun utilisateur récent</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="events">
              {data.recent.events.length > 0 ? (
                <div className="space-y-4">
                  {data.recent.events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-gray-500">{event.location}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(event.eventDate).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed border-gray-300 rounded">
                  <p className="text-gray-400">Aucun événement récent</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="ads">
              {data.recent.ads.length > 0 ? (
                <div className="space-y-4">
                  {data.recent.ads.map((ad) => (
                    <div key={ad.id} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <p className="font-medium">{ad.title}</p>
                        <p className="text-sm text-gray-500">{getTrocCategoryLabel(ad.category)}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(ad.createdAt || new Date()).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed border-gray-300 rounded">
                  <p className="text-gray-400">Aucune annonce récente</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
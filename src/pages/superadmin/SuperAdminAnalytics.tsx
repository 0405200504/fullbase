import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFeatureAdoption, useNicheComparison, useGrowthMetrics } from "@/hooks/useAnalytics";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/dateUtils";
import { Target, Users, Package, DollarSign, TrendingUp, Activity, Clock, UserX } from "lucide-react";

const SuperAdminAnalytics = () => {
  const { data: featureStats, isLoading: isLoadingFeatures } = useFeatureAdoption();
  const { data: nicheData, isLoading: isLoadingNiches } = useNicheComparison();
  const { data: growthMetrics, isLoading: isLoadingGrowth } = useGrowthMetrics();

  if (isLoadingFeatures || isLoadingNiches || isLoadingGrowth) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Avançado</h1>
        <p className="text-muted-foreground">
          Insights profundos sobre uso da plataforma e performance
        </p>
      </div>

      {/* Métricas de Crescimento */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Ativação</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{growthMetrics?.activation_rate}%</div>
            <p className="text-xs text-muted-foreground">
              {growthMetrics?.activated_accounts} de {growthMetrics?.total_accounts} contas ativadas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Contas que completaram 2+ ações-chave
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo até Primeira Venda</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {growthMetrics?.avg_days_to_first_sale || 0} dias
            </div>
            <p className="text-xs text-muted-foreground">
              Média de tempo desde criação até primeira venda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{growthMetrics?.churn_rate}%</div>
            <p className="text-xs text-muted-foreground">
              {growthMetrics?.inactive_accounts} contas inativas (30+ dias)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Adoção de Funcionalidades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Adoção de Funcionalidades
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Metas</span>
                </div>
                <span className="text-sm font-bold">{featureStats?.goals_adoption}%</span>
              </div>
              <Progress value={featureStats?.goals_adoption || 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                % de contas que criaram pelo menos uma meta
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Equipe</span>
                </div>
                <span className="text-sm font-bold">{featureStats?.team_adoption}%</span>
              </div>
              <Progress value={featureStats?.team_adoption || 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                % de contas que adicionaram colaboradores
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Produtos</span>
                </div>
                <span className="text-sm font-bold">{featureStats?.products_adoption}%</span>
              </div>
              <Progress value={featureStats?.products_adoption || 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                % de contas que cadastraram produtos
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Vendas</span>
                </div>
                <span className="text-sm font-bold">{featureStats?.sales_adoption}%</span>
              </div>
              <Progress value={featureStats?.sales_adoption || 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                % de contas que registraram vendas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Análise Comparativa por Nicho */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Comparativa por Nicho</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nicho de Mercado</TableHead>
                <TableHead className="text-right">Nº de Contas</TableHead>
                <TableHead className="text-right">Total de Vendas</TableHead>
                <TableHead className="text-right">Faturamento Total</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Taxa de Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nicheData && nicheData.length > 0 ? (
                nicheData.map((niche) => (
                  <TableRow key={niche.niche}>
                    <TableCell className="font-medium">{niche.niche}</TableCell>
                    <TableCell className="text-right">{niche.num_accounts}</TableCell>
                    <TableCell className="text-right">{niche.total_sales}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(niche.total_revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(niche.avg_ticket)}
                    </TableCell>
                    <TableCell className="text-right">{niche.avg_conversion_rate}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum dado disponível ainda
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminAnalytics;

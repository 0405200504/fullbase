import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, DollarSign, Target, AlertCircle } from "lucide-react";

interface OnboardingData {
  id: string;
  nome: string;
  email: string;
  company_name: string | null;
  niche: string | null;
  team_size: string | null;
  monthly_revenue: string | null;
  main_goal: string | null;
  main_challenge: string | null;
  created_at: string;
  account_id: string;
  nome_empresa: string;
}

const Onboarding = () => {
  const [loading, setLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData[]>([]);

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          nome,
          email,
          telefone,
          company_name,
          niche,
          team_size,
          monthly_revenue,
          main_goal,
          main_challenge,
          created_at,
          account_id,
          accounts!inner(nome_empresa)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = data?.map(item => ({
        ...item,
        nome_empresa: (item.accounts as any).nome_empresa
      })) || [];

      setOnboardingData(formatted);
    } catch (error) {
      console.error("Erro ao buscar dados de onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Respostas de Onboarding</h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {onboardingData.length} empresas
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Nicho Definido</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {onboardingData.filter(d => d.niche).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Tamanho de Equipe</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {onboardingData.filter(d => d.team_size).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Receita Informada</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {onboardingData.filter(d => d.monthly_revenue).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Objetivo Definido</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {onboardingData.filter(d => d.main_goal).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as Respostas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Tamanho da Equipe</TableHead>
                  <TableHead>Receita Mensal</TableHead>
                  <TableHead>Objetivo Principal</TableHead>
                  <TableHead>Desafio Principal</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onboardingData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome_empresa || item.company_name || "-"}</TableCell>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>{(item as any).telefone || "-"}</TableCell>
                    <TableCell>
                      {item.niche ? (
                        <Badge variant="secondary">{item.niche}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.team_size ? (
                        <Badge variant="outline">{item.team_size}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.monthly_revenue ? (
                        <Badge variant="outline">{item.monthly_revenue}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.main_goal || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.main_challenge || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;

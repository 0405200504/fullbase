import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Users, Building2, TrendingUp, Filter, Calendar as CalendarIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface Account {
  id: string;
  nome_empresa: string;
}

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  created_at: string;
  account_id: string;
  nome_empresa: string;
  etapa_nome: string | null;
  sdr_nome: string | null;
  closer_nome: string | null;
  fonte_trafego: string | null;
}

type PeriodType = "today" | "7days" | "30days" | "custom" | "all";

const SuperAdminLeads = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [periodType, setPeriodType] = useState<PeriodType>("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 50;

  useEffect(() => {
    fetchAccounts();
    fetchLeads();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leads, selectedAccount, periodType, customDateRange]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, nome_empresa")
        .eq("ativo", true)
        .order("nome_empresa");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Erro ao buscar contas:", error);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      // Buscar leads sem foreign keys para SDR/Closer
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select(`
          id,
          nome,
          telefone,
          email,
          created_at,
          account_id,
          fonte_trafego,
          etapa_id,
          sdr_id,
          closer_id,
          accounts!inner(nome_empresa),
          etapas_funil(nome)
        `)
        .eq("arquivado", false)
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;

      // Buscar todos os team_members para mapear SDR/Closer
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("id, nome, account_id");

      const teamMap = new Map((teamMembers || []).map(tm => [tm.id, tm.nome]));

      const formatted: Lead[] = (leadsData || []).map(item => ({
        id: item.id,
        nome: item.nome,
        telefone: item.telefone,
        email: item.email,
        created_at: item.created_at,
        account_id: item.account_id,
        nome_empresa: (item.accounts as any).nome_empresa,
        etapa_nome: (item.etapas_funil as any)?.nome || null,
        sdr_nome: item.sdr_id ? teamMap.get(item.sdr_id) || null : null,
        closer_nome: item.closer_id ? teamMap.get(item.closer_id) || null : null,
        fonte_trafego: item.fonte_trafego
      }));

      setLeads(formatted);
    } catch (error) {
      console.error("Erro ao buscar leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (periodType) {
      case "today":
        return {
          startDate: format(now, "yyyy-MM-dd"),
          endDate: format(now, "yyyy-MM-dd"),
        };
      case "7days":
        return {
          startDate: format(subDays(now, 6), "yyyy-MM-dd"),
          endDate: format(now, "yyyy-MM-dd"),
        };
      case "30days":
        return {
          startDate: format(subDays(now, 29), "yyyy-MM-dd"),
          endDate: format(now, "yyyy-MM-dd"),
        };
      case "custom":
        if (customDateRange?.from && customDateRange?.to) {
          return {
            startDate: format(customDateRange.from, "yyyy-MM-dd"),
            endDate: format(customDateRange.to, "yyyy-MM-dd"),
          };
        }
        return null;
      default:
        return null;
    }
  };

  const applyFilters = () => {
    if (leads.length === 0) {
      setFilteredLeads([]);
      return;
    }

    let filtered = [...leads];

    // Filtro de empresa
    if (selectedAccount !== "all") {
      filtered = filtered.filter(lead => lead.account_id === selectedAccount);
    }

    // Filtro de período
    const dateRange = getDateRange();
    if (dateRange) {
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.created_at);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate + "T23:59:59");
        return leadDate >= startDate && leadDate <= endDate;
      });
    }

    setFilteredLeads(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedAccount("all");
    setPeriodType("all");
    setCustomDateRange(undefined);
  };

  const uniqueAccounts = new Set(filteredLeads.map(l => l.nome_empresa));

  // Paginação
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstLead, indexOfLastLead);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <h1 className="text-3xl font-bold">Leads da Plataforma</h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredLeads.length} leads
        </Badge>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros de Período Rápido */}
          <div className="space-y-2">
            <Label>Período</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={periodType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodType("all")}
              >
                Tudo
              </Button>
              <Button
                variant={periodType === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodType("today")}
              >
                Hoje
              </Button>
              <Button
                variant={periodType === "7days" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodType("7days")}
              >
                Últimos 7 dias
              </Button>
              <Button
                variant={periodType === "30days" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodType("30days")}
              >
                Últimos 30 dias
              </Button>
              
              {/* Calendário para período personalizado */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={periodType === "custom" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      periodType === "custom" &&
                        customDateRange?.from &&
                        customDateRange?.to &&
                        "border-primary"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {periodType === "custom" && customDateRange?.from && customDateRange?.to ? (
                      <>
                        {format(customDateRange.from, "dd/MM", { locale: ptBR })} -{" "}
                        {format(customDateRange.to, "dd/MM", { locale: ptBR })}
                      </>
                    ) : (
                      "Personalizado"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={customDateRange}
                    onSelect={(range) => {
                      setCustomDateRange(range);
                      if (range?.from && range?.to) {
                        setPeriodType("custom");
                      }
                    }}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Outros Filtros */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="account">Empresa</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger id="account">
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nome_empresa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLeads.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedAccount === "all" ? "Todas as empresas" : "Empresa selecionada"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueAccounts.size}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Com leads no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Empresa</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uniqueAccounts.size > 0 
                ? Math.round(filteredLeads.length / uniqueAccounts.size)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Leads por empresa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>SDR</TableHead>
                  <TableHead>Closer</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Data de Criação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Nenhum lead encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  currentLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.nome}</TableCell>
                      <TableCell>{lead.telefone}</TableCell>
                      <TableCell>{lead.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.nome_empresa}</Badge>
                      </TableCell>
                      <TableCell>
                        {lead.etapa_nome ? (
                          <Badge variant="secondary">{lead.etapa_nome}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{lead.sdr_nome || "-"}</TableCell>
                      <TableCell>{lead.closer_nome || "-"}</TableCell>
                      <TableCell>
                        {lead.fonte_trafego ? (
                          <Badge variant="outline">{lead.fonte_trafego}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {indexOfFirstLead + 1} a {Math.min(indexOfLastLead, filteredLeads.length)} de {filteredLeads.length} leads
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminLeads;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Filter, X, Save, FolderOpen, CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { EtapaFunil } from "@/hooks/useEtapasFunil";
import type { Profile } from "@/hooks/useProfiles";

export interface LeadFiltersState {
  dateFrom?: Date;
  dateTo?: Date;
  valueMin?: number;
  valueMax?: number;
  sdrId?: string;
  closerId?: string;
  etapaId?: string;
  fonte?: string;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: LeadFiltersState;
}

interface LeadFiltersProps {
  filters: LeadFiltersState;
  onFiltersChange: (filters: LeadFiltersState) => void;
  stages: EtapaFunil[];
  sdrs: Profile[];
  closers: Profile[];
}

const PRESETS_STORAGE_KEY = "lead-filter-presets";

export const LeadFilters = ({
  filters,
  onFiltersChange,
  stages,
  sdrs,
  closers,
}: LeadFiltersProps) => {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const presetsWithDates = parsed.map((preset: any) => ({
          ...preset,
          filters: {
            ...preset.filters,
            dateFrom: preset.filters.dateFrom ? new Date(preset.filters.dateFrom) : undefined,
            dateTo: preset.filters.dateTo ? new Date(preset.filters.dateTo) : undefined,
          },
        }));
        setPresets(presetsWithDates);
      } catch (e) {
        console.error("Error loading presets:", e);
      }
    }
  }, []);

  const savePresets = (newPresets: FilterPreset[]) => {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
    setPresets(newPresets);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error("Digite um nome para o filtro");
      return;
    }

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: { ...filters },
    };

    const updatedPresets = [...presets, newPreset];
    savePresets(updatedPresets);
    toast.success("Filtro salvo com sucesso!");
    setPresetName("");
    setSaveDialogOpen(false);
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    onFiltersChange(preset.filters);
    setLoadDialogOpen(false);
    toast.success(`Filtro "${preset.name}" aplicado`);
  };

  const handleDeletePreset = (presetId: string) => {
    const updatedPresets = presets.filter((p) => p.id !== presetId);
    savePresets(updatedPresets);
    toast.success("Filtro excluído");
  };

  const clearFilters = () => {
    onFiltersChange({});
    toast.success("Filtros limpos");
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined).length;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="font-semibold">Filtros Avançados</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount} ativos</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} modal={false}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Salvar Filtro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="preset-name">Nome do Filtro</Label>
                  <Input
                    id="preset-name"
                    placeholder="Ex: Leads Alto Valor"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                </div>
                <Button onClick={handleSavePreset} className="w-full">
                  Salvar Filtro
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen} modal={false}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Carregar
              </Button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Carregar Filtro Salvo</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 pt-4">
                {presets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum filtro salvo
                  </p>
                ) : (
                  presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <button
                        onClick={() => handleLoadPreset(preset)}
                        className="flex-1 text-left font-medium"
                      >
                        {preset.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePreset(preset.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label>Data de Criação (De)</Label>
          <Popover modal={false}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yyyy") : "Selecione"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) =>
                  onFiltersChange({ ...filters, dateFrom: date })
                }
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Data de Criação (Até)</Label>
          <Popover modal={false}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(filters.dateTo, "dd/MM/yyyy") : "Selecione"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) =>
                  onFiltersChange({ ...filters, dateTo: date })
                }
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Value Range */}
        <div className="space-y-2">
          <Label>Valor Mínimo (R$)</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={filters.valueMin || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                valueMin: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Valor Máximo (R$)</Label>
          <Input
            type="number"
            placeholder="100000.00"
            value={filters.valueMax || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                valueMax: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
          />
        </div>

        {/* Team Members */}
        <div className="space-y-2">
          <Label>SDR</Label>
          <Select
            value={filters.sdrId || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                sdrId: value === "all" ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {sdrs.map((sdr) => (
                <SelectItem key={sdr.id} value={sdr.id}>
                  {sdr.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Closer</Label>
          <Select
            value={filters.closerId || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                closerId: value === "all" ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {closers.map((closer) => (
                <SelectItem key={closer.id} value={closer.id}>
                  {closer.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stage */}
        <div className="space-y-2">
          <Label>Etapa</Label>
          <Select
            value={filters.etapaId || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                etapaId: value === "all" ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source */}
        <div className="space-y-2">
          <Label>Fonte de Tráfego</Label>
          <Input
            placeholder="Ex: Facebook, Google"
            value={filters.fonte || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                fonte: e.target.value || undefined,
              })
            }
          />
        </div>
      </div>
    </div>
  );
};

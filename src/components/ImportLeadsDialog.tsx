import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useImportLeads, type MappedLead } from "@/hooks/useImportLeads";
import { useProdutos } from "@/hooks/useProdutos";
import { useEtapasFunil } from "@/hooks/useEtapasFunil";
import { useProfiles } from "@/hooks/useProfiles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SheetData {
  headers: string[];
  rows: any[][];
}

interface ValidationStats {
  totalRows: number;
  validPhones: number;
  invalidPhones: number;
  emptyPhones: number;
  phoneIssues: string[];
}

export function ImportLeadsDialog({ open, onOpenChange }: ImportLeadsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"upload" | "map" | "importing">("upload");
  const [validationStats, setValidationStats] = useState<ValidationStats | null>(null);

  const { data: produtos } = useProdutos();
  const { data: etapas } = useEtapasFunil();
  const { data: sdrs } = useProfiles("sdr");

  const importLeads = useImportLeads();

  // Validate Brazilian phone number
  const validatePhone = (phone: string): boolean => {
    if (!phone) return false;
    
    // Remove all non-digit characters
    const digits = String(phone).replace(/\D/g, '');
    
    // Brazilian phone: 10 digits (DDD + 8) or 11 digits (DDD + 9)
    if (digits.length !== 10 && digits.length !== 11) return false;
    
    // DDD must be between 11-99
    const ddd = parseInt(digits.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    
    return true;
  };

  // Validate phone column data
  const validatePhoneColumn = (rows: any[][], phoneColumnIndex: number): ValidationStats => {
    let validPhones = 0;
    let invalidPhones = 0;
    let emptyPhones = 0;
    const phoneIssues: string[] = [];

    rows.forEach((row, index) => {
      const phoneValue = row[phoneColumnIndex];
      
      if (!phoneValue || String(phoneValue).trim() === '') {
        emptyPhones++;
        if (phoneIssues.length < 5) {
          phoneIssues.push(`Linha ${index + 2}: Telefone vazio`);
        }
      } else if (!validatePhone(phoneValue)) {
        invalidPhones++;
        if (phoneIssues.length < 5) {
          const digits = String(phoneValue).replace(/\D/g, '');
          let reason = 'formato inválido';
          if (digits.length < 10) reason = 'muito curto';
          else if (digits.length > 11) reason = 'muito longo';
          phoneIssues.push(`Linha ${index + 2}: ${phoneValue} (${reason})`);
        }
      } else {
        validPhones++;
      }
    });

    return {
      totalRows: rows.length,
      validPhones,
      invalidPhones,
      emptyPhones,
      phoneIssues
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(uploadedFile.type) && !uploadedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Por favor, selecione um arquivo Excel válido (.xlsx ou .xls)");
      return;
    }

    setFile(uploadedFile);

    const reader = new FileReader();
    
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo. Tente novamente.");
      setFile(null);
    };
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        if (!workbook.SheetNames.length) {
          throw new Error("A planilha está vazia");
        }
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" }) as any[][];

        if (jsonData.length < 2) {
          throw new Error("A planilha deve ter pelo menos uma linha de cabeçalho e uma linha de dados");
        }

        const headers = jsonData[0].map(h => String(h || "").trim()).filter(h => h);
        const rows = jsonData.slice(1).filter(row => 
          row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== "")
        );

        if (rows.length === 0) {
          throw new Error("Não há dados válidos na planilha");
        }

        setSheetData({ headers, rows });
        
        // Auto-detect columns
        const autoMapping: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          const headerLower = header.toLowerCase().trim();
          
          // Nome
          if (headerLower.includes('nome') && !headerLower.includes('sobrenome')) {
            autoMapping.nome = String(index);
          }
          
          // Telefone/WhatsApp/Celular
          if (headerLower.includes('telefone') || 
              headerLower.includes('whatsapp') || 
              headerLower.includes('celular') ||
              headerLower.includes('tel') ||
              headerLower.includes('fone')) {
            autoMapping.telefone = String(index);
          }
          
          // Email
          if (headerLower.includes('email') || headerLower.includes('e-mail')) {
            autoMapping.email = String(index);
          }
          
          // Fonte de Tráfego
          if (headerLower.includes('fonte') || 
              headerLower.includes('origem') ||
              headerLower.includes('trafego') ||
              headerLower.includes('tráfego')) {
            autoMapping.fonte_trafego = String(index);
          }
          
          // Produto
          if (headerLower.includes('produto') || headerLower.includes('servico') || headerLower.includes('serviço')) {
            autoMapping.produto_nome = String(index);
          }
          
          // Etapa
          if (headerLower.includes('etapa') || headerLower.includes('status') || headerLower.includes('fase')) {
            autoMapping.etapa_nome = String(index);
          }
          
          // SDR
          if (headerLower.includes('sdr') || headerLower.includes('vendedor') || headerLower.includes('responsavel') || headerLower.includes('responsável')) {
            autoMapping.sdr_nome = String(index);
          }
          
          // Valor
          if (headerLower.includes('valor') || headerLower.includes('preco') || headerLower.includes('preço')) {
            autoMapping.valor_proposta = String(index);
          }
          
          // Renda/Faturamento
          if (headerLower.includes('renda') || headerLower.includes('faturamento') || 
              headerLower.includes('receita') || headerLower.includes('lucro') || 
              headerLower.includes('revenue') || headerLower.includes('income')) {
            autoMapping.renda_mensal = String(index);
          }
          
          // Investimento/Caixa
          if (headerLower.includes('investimento') || headerLower.includes('caixa') || 
              headerLower.includes('capital') || headerLower.includes('budget') || 
              headerLower.includes('orcamento') || headerLower.includes('orçamento')) {
            autoMapping.investimento_disponivel = String(index);
          }
          
          // Dificuldades/Problemas
          if (headerLower.includes('dificuldade') || headerLower.includes('problem') || 
              headerLower.includes('gargalo') || headerLower.includes('desafio') || 
              headerLower.includes('dor') || headerLower.includes('pain')) {
            autoMapping.dificuldades = String(index);
          }
        });
        
        setColumnMapping(autoMapping);
        
        // Validate phones if auto-detected
        if (autoMapping.telefone) {
          const phoneColIndex = parseInt(autoMapping.telefone);
          const stats = validatePhoneColumn(rows, phoneColIndex);
          setValidationStats(stats);
        }
        
        setStep("map");
        
        const autoMapped = Object.keys(autoMapping).length;
        toast.success(
          `${rows.length} linhas carregadas! ${autoMapped > 0 ? `${autoMapped} colunas mapeadas automaticamente.` : 'Mapeie as colunas manualmente.'}`
        );
      } catch (error: any) {
        console.error("Erro ao processar planilha:", error);
        toast.error("Erro ao ler arquivo: " + error.message);
        setFile(null);
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleImport = async () => {
    if (!sheetData) return;

    // Validate required mappings
    if (!columnMapping.nome || !columnMapping.telefone) {
      alert("Nome e Telefone são obrigatórios!");
      return;
    }

    setStep("importing");

    const mappedLeads: MappedLead[] = sheetData.rows.map(row => {
      const lead: any = {};

      Object.entries(columnMapping).forEach(([field, columnIndex]) => {
        if (columnIndex === "skip") return;

        const value = row[parseInt(columnIndex)];

        // Process based on field type
        switch (field) {
          case "nome":
          case "telefone":
          case "email":
          case "fonte_trafego":
          case "produto_nome":
          case "etapa_nome":
          case "sdr_nome":
          case "dificuldades":
            lead[field] = value ? String(value).trim() : null;
            break;
          case "valor_proposta":
          case "renda_mensal":
          case "investimento_disponivel":
            lead[field] = value ? parseFloat(String(value).replace(/[^\d.,]/g, "").replace(",", ".")) : null;
            break;
        }
      });

      return lead as MappedLead;
    }).filter(lead => lead.nome && lead.telefone);

    // Prepare lookup data
    const lookupData = {
      produtos: produtos || [],
      etapas: etapas || [],
      sdrs: sdrs || [],
    };

    try {
      await importLeads.mutateAsync({ leads: mappedLeads, lookupData });
      onOpenChange(false);
      resetState();
    } catch (error) {
      setStep("map");
    }
  };

  const resetState = () => {
    setFile(null);
    setSheetData(null);
    setColumnMapping({});
    setValidationStats(null);
    setStep("upload");
  };

  const handleClose = (open: boolean) => {
    if (!open && step !== "importing") {
      resetState();
    }
    onOpenChange(open);
  };

  const requiredFields = [
    { key: "nome", label: "Nome *", type: "text" },
    { key: "telefone", label: "Telefone *", type: "text" },
  ];

  const optionalFields = [
    { key: "email", label: "Email", type: "text" },
    { key: "valor_proposta", label: "Valor Proposta", type: "number" },
    { key: "fonte_trafego", label: "Fonte de Tráfego", type: "text" },
    { key: "produto_nome", label: "Produto (Nome)", type: "text" },
    { key: "etapa_nome", label: "Etapa (Nome)", type: "text" },
    { key: "sdr_nome", label: "SDR (Nome)", type: "text" },
  ];
  
  const qualificationFields = [
    { key: "renda_mensal", label: "Renda/Faturamento Mensal", type: "number" },
    { key: "investimento_disponivel", label: "Investimento/Caixa Disponível", type: "number" },
    { key: "dificuldades", label: "Dificuldades/Gargalos", type: "text" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Leads de Planilha
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 p-1">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Faça upload de um arquivo Excel (.xlsx, .xls). A primeira linha deve conter os cabeçalhos das colunas.
              </AlertDescription>
            </Alert>

            <label 
              htmlFor="file-upload" 
              className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 hover:border-primary transition-colors cursor-pointer"
            >
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <span className="text-sm text-primary hover:underline">
                Clique para selecionar um arquivo
              </span>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  {file.name}
                </p>
              )}
            </label>
          </div>
        )}

        {step === "map" && sheetData && (
          <>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 p-1">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Arquivo carregado com sucesso! {sheetData.rows.length} linhas encontradas. 
                    Agora mapeie as colunas da planilha para os campos do lead.
                  </AlertDescription>
                </Alert>

                <div className="space-y-6">
                  {/* Required Fields */}
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-foreground border-b pb-2">
                      Campos Obrigatórios
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {requiredFields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label className="text-destructive">{field.label}</Label>
                          <Select
                            value={columnMapping[field.key] || "skip"}
                            onValueChange={(value) => {
                              setColumnMapping({ ...columnMapping, [field.key]: value });
                              
                              // Re-validate phones when telefone column changes
                              if (field.key === 'telefone' && value !== 'skip' && sheetData) {
                                const stats = validatePhoneColumn(sheetData.rows, parseInt(value));
                                setValidationStats(stats);
                              } else if (field.key === 'telefone' && value === 'skip') {
                                setValidationStats(null);
                              }
                            }}
                          >
                            <SelectTrigger className="border-destructive">
                              <SelectValue placeholder="Selecione a coluna" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">-- Não importar --</SelectItem>
                              {sheetData.headers.map((header, index) => (
                                <SelectItem key={index} value={String(index)}>
                                  {header || `Coluna ${index + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phone Validation Stats */}
                  {validationStats && columnMapping.telefone && columnMapping.telefone !== 'skip' && (
                    <Alert variant={validationStats.invalidPhones > 0 || validationStats.emptyPhones > 0 ? "destructive" : "default"}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="font-semibold">Validação de Telefones:</div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="text-green-600 dark:text-green-400">
                              ✓ {validationStats.validPhones} válidos
                            </div>
                            {validationStats.invalidPhones > 0 && (
                              <div className="text-destructive">
                                ✗ {validationStats.invalidPhones} inválidos
                              </div>
                            )}
                            {validationStats.emptyPhones > 0 && (
                              <div className="text-amber-600 dark:text-amber-400">
                                ⚠ {validationStats.emptyPhones} vazios
                              </div>
                            )}
                          </div>
                          {validationStats.phoneIssues.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <div className="text-xs font-medium">Exemplos de problemas:</div>
                              {validationStats.phoneIssues.map((issue, idx) => (
                                <div key={idx} className="text-xs opacity-80">• {issue}</div>
                              ))}
                              {(validationStats.invalidPhones + validationStats.emptyPhones) > 5 && (
                                <div className="text-xs opacity-60">
                                  ... e mais {(validationStats.invalidPhones + validationStats.emptyPhones) - 5} problemas
                                </div>
                              )}
                            </div>
                          )}
                          <div className="text-xs opacity-70 mt-2">
                            💡 Formato esperado: (XX) XXXXX-XXXX ou apenas dígitos com DDD (10-11 dígitos)
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Optional Fields */}
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-muted-foreground border-b pb-2">
                      Campos Opcionais
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {optionalFields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label>{field.label}</Label>
                          <Select
                            value={columnMapping[field.key] || "skip"}
                            onValueChange={(value) =>
                              setColumnMapping({ ...columnMapping, [field.key]: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a coluna" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">-- Não importar --</SelectItem>
                              {sheetData.headers.map((header, index) => (
                                <SelectItem key={index} value={String(index)}>
                                  {header || `Coluna ${index + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Qualification Fields */}
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-primary border-b pb-2">
                      Informações de Qualificação (MQL)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {qualificationFields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label className="text-primary">{field.label}</Label>
                          <Select
                            value={columnMapping[field.key] || "skip"}
                            onValueChange={(value) =>
                              setColumnMapping({ ...columnMapping, [field.key]: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a coluna" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">-- Não importar --</SelectItem>
                              {sheetData.headers.map((header, index) => (
                                <SelectItem key={index} value={String(index)}>
                                  {header || `Coluna ${index + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preview dos Dados (primeiras 5 linhas)</Label>
                  <div className="border rounded-lg max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {sheetData.headers.map((header, index) => (
                            <TableHead key={index} className="whitespace-nowrap">
                              {header || `Coluna ${index + 1}`}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheetData.rows.slice(0, 5).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex} className="whitespace-nowrap">
                                {cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex justify-between gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={!columnMapping.nome || !columnMapping.telefone}>
                Importar {sheetData.rows.length} Leads
              </Button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Importando leads...</p>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}

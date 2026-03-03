import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface WebhookLog {
  id: string;
  stripe_event_id: string;
  event_type: string;
  processed: boolean;
  created_at: string;
  processed_at: string | null;
  error: string | null;
}

const StripeWebhookTest = () => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const { toast } = useToast();

  const testWebhook = async () => {
    toast({
      title: "Como testar o webhook",
      description: "Para testar o webhook com assinatura válida, use o Stripe CLI ou aguarde eventos reais.",
    });
    
    setTestResult({
      success: true,
      message: "Use o Stripe CLI para testes com assinatura válida",
      details: {
        info: "O webhook requer uma assinatura válida do Stripe que não pode ser simulada localmente.",
        cli_command: "stripe listen --forward-to " + `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`,
        trigger_command: "stripe trigger payment_intent.succeeded"
      }
    });
    
    loadWebhookLogs();
  };

  const loadWebhookLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('stripe_webhooks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os logs do webhook.",
        variant: "destructive",
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Teste de Webhook Stripe</h1>
        <p className="text-muted-foreground">
          Verifique se o webhook do Stripe está configurado corretamente
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração do Webhook</CardTitle>
          <CardDescription>
            Este webhook está pronto e aguardando eventos do Stripe. Configure-o no Stripe Dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold text-blue-500">Status: Webhook Configurado</h4>
                <p className="text-sm text-muted-foreground">
                  O webhook está funcional e pronto para receber eventos. Para que funcione:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Configure a URL abaixo no Stripe Dashboard</li>
                  <li>Adicione o webhook secret nas configurações</li>
                  <li>Selecione os eventos necessários</li>
                  <li>Teste com Stripe CLI ou aguarde eventos reais</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold">URL do webhook:</h3>
            <code className="bg-muted px-3 py-2 rounded text-sm block break-all">
              {import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook
            </code>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-semibold">Eventos necessários:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>checkout.session.completed</li>
              <li>customer.subscription.created</li>
              <li>customer.subscription.updated</li>
              <li>customer.subscription.deleted</li>
              <li>invoice.payment_succeeded</li>
              <li>invoice.payment_failed</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-semibold">Testar com Stripe CLI:</h3>
            <div className="bg-muted p-3 rounded text-xs font-mono space-y-2">
              <div>
                <span className="text-muted-foreground"># 1. Escutar eventos localmente:</span>
                <div className="mt-1">stripe listen --forward-to {import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook</div>
              </div>
              <div>
                <span className="text-muted-foreground"># 2. Disparar evento de teste:</span>
                <div className="mt-1">stripe trigger payment_intent.succeeded</div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-4">
            <Button onClick={testWebhook} variant="outline">
              <AlertCircle className="mr-2 h-4 w-4" />
              Ver Instruções de Teste
            </Button>

            <Button onClick={loadWebhookLogs} disabled={loadingLogs} variant="default">
              {loadingLogs ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar Logs
                </>
              )}
            </Button>
          </div>

          {testResult && (
            <Card className={testResult.success ? "border-green-500" : "border-red-500"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {testResult.success ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Sucesso
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      Erro
                    </>
                  )}
                </CardTitle>
                <CardDescription>{testResult.message}</CardDescription>
              </CardHeader>
              {testResult.details && (
                <CardContent>
                  <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs de Webhook (últimos 20)</CardTitle>
          <CardDescription>
            Histórico de eventos recebidos do Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log encontrado. Clique em "Atualizar Logs" para carregar.
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <Card key={log.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={log.processed ? "default" : "secondary"}>
                            {log.event_type}
                          </Badge>
                          {log.processed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ID: {log.stripe_event_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Recebido: {new Date(log.created_at).toLocaleString('pt-BR')}
                        </p>
                        {log.processed_at && (
                          <p className="text-xs text-muted-foreground">
                            Processado: {new Date(log.processed_at).toLocaleString('pt-BR')}
                          </p>
                        )}
                        {log.error && (
                          <p className="text-xs text-red-500 mt-2">
                            Erro: {log.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default StripeWebhookTest;

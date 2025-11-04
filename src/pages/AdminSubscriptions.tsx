import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Check, RefreshCw, X, ArrowLeft } from "lucide-react";
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

interface Subscription {
  id: string;
  client_name: string;
  client_email: string;
  plan_type: string;
  payment_status: string;
  end_date: string;
  is_active: boolean;
}

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Enable realtime sync for admin
  useRealtimeSync(true);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_admin_subscriptions");

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const handleAction = async (subscriptionId: string, action: string) => {
    try {
      setActionLoading(subscriptionId);
      const { error } = await supabase.rpc("admin_renew_subscription", {
        p_subscription_id: subscriptionId,
        p_action: action,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Subscrição ${action === "aceitar" ? "aceite" : action === "renovar" ? "renovada" : "recusada"} com sucesso!`,
      });

      await loadSubscriptions();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getPlanTypeBadge = (planType: string) => {
    const colors = {
      S: "bg-blue-500",
      X: "bg-purple-500",
    };
    return (
      <Badge className={colors[planType as keyof typeof colors] || "bg-gray-500"}>
        Plano {planType}
      </Badge>
    );
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    // Se não está ativa OU se o status é cancelled, mostra Cancelada
    if (!isActive || status === "cancelled") {
      return <Badge variant="destructive">Cancelada</Badge>;
    }
    
    // Se está ativa e confirmada, mostra Confirmada
    if (status === "confirmed") {
      return <Badge className="bg-green-500">Confirmada</Badge>;
    }
    
    // Se está ativa e pendente, mostra Pendente
    if (status === "pending") {
      return <Badge className="bg-yellow-500">Pendente</Badge>;
    }
    
    // Fallback
    return <Badge className="bg-gray-500">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Subscrições</h1>
        <Button onClick={loadSubscriptions} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Data de Renovação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma subscrição encontrada
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.client_name || "N/A"}</TableCell>
                    <TableCell>{sub.client_email}</TableCell>
                    <TableCell>{getPlanTypeBadge(sub.plan_type)}</TableCell>
                    <TableCell>{getStatusBadge(sub.payment_status, sub.is_active)}</TableCell>
                    <TableCell>
                      {sub.end_date ? format(new Date(sub.end_date), "dd/MM/yyyy") : "N/A"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {sub.is_active && sub.payment_status === "pending" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleAction(sub.id, "aceitar")}
                          disabled={actionLoading === sub.id}
                        >
                          {actionLoading === sub.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Aceitar
                            </>
                          )}
                        </Button>
                      )}
                      {sub.is_active && sub.payment_status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(sub.id, "renovar")}
                          disabled={actionLoading === sub.id}
                        >
                          {actionLoading === sub.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Renovar
                            </>
                          )}
                        </Button>
                      )}
                      {sub.is_active && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(sub.id, "recusar")}
                          disabled={actionLoading === sub.id}
                        >
                          {actionLoading === sub.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Recusar
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-4 space-y-4">
          {subscriptions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma subscrição encontrada
            </div>
          ) : (
            subscriptions.map((sub) => (
              <Card key={sub.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{sub.client_name || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">{sub.client_email}</div>
                    </div>
                    {getPlanTypeBadge(sub.plan_type)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    {getStatusBadge(sub.payment_status, sub.is_active)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Renovação:</span>
                    <span className="text-sm">
                      {sub.end_date ? format(new Date(sub.end_date), "dd/MM/yyyy") : "N/A"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    {sub.is_active && sub.payment_status === "pending" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAction(sub.id, "aceitar")}
                        disabled={actionLoading === sub.id}
                        className="w-full"
                      >
                        {actionLoading === sub.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Aceitar
                          </>
                        )}
                      </Button>
                    )}
                    {sub.is_active && sub.payment_status === "confirmed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(sub.id, "renovar")}
                        disabled={actionLoading === sub.id}
                        className="w-full"
                      >
                        {actionLoading === sub.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Renovar
                          </>
                        )}
                      </Button>
                    )}
                    {sub.is_active && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(sub.id, "recusar")}
                        disabled={actionLoading === sub.id}
                        className="w-full"
                      >
                        {actionLoading === sub.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Recusar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

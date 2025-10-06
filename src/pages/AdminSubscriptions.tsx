import { useEffect, useState } from "react";
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
import { Loader2, Check, RefreshCw, X } from "lucide-react";

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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

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
    if (!isActive) {
      return <Badge variant="destructive">Cancelada</Badge>;
    }
    
    const colors = {
      pending: "bg-yellow-500",
      confirmed: "bg-green-500",
      cancelled: "bg-red-500",
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-500"}>
        {status === "pending" ? "Pendente" : status === "confirmed" ? "Confirmada" : "Cancelada"}
      </Badge>
    );
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Subscrições</h1>
        <Button onClick={loadSubscriptions} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
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
      </Card>
    </div>
  );
}

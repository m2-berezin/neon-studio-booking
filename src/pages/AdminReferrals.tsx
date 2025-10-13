import { AdminLayout } from "@/components/admin/AdminLayout";
import ReferralCodeStats from "@/components/admin/ReferralCodeStats";

const AdminReferrals = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Referrals</h1>
          <p className="text-muted-foreground">
            Gerencie e acompanhe os códigos de convite e recompensas
          </p>
        </div>
        
        <ReferralCodeStats />
      </div>
    </AdminLayout>
  );
};

export default AdminReferrals;

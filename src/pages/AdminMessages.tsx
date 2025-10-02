import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const AdminMessages = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-center mb-2">Admin - Mensagens</h2>
          <p className="text-muted-foreground text-center">
            Funcionalidade em desenvolvimento
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMessages;

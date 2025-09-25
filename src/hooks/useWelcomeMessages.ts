import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';

export const useWelcomeMessages = () => {
  const { user, profile } = useAuth();
  const { startAdminConversation } = useMessages();
  const { createNotification } = useNotifications();

  const sendWelcomeMessages = async () => {
    if (!user || !profile) return;

    try {
      // Check if user already received welcome messages
      const { data: existingMessages, error } = await supabase
        .from('messages')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('thread_type', 'welcome')
        .limit(1);

      if (error) {
        console.error('Error checking existing welcome messages:', error);
        return;
      }

      // If already has welcome messages, don't send again
      if (existingMessages && existingMessages.length > 0) {
        return;
      }

      // Find Ghost Wayne (admin user)
      const { data: adminUser, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (adminError || !adminUser) {
        console.error('Error finding admin user:', adminError);
        return;
      }

      // Send first welcome message
      const firstMessage = `Bem vindo à 7T7Studios App, esta é a minha visão para a interação entre a música e a tecnologia.
Aqui podes fazer reservas, enviar projetos, comprar beats e ganhar ofertas. 🎁 
Qualquer dúvida manda-me mensagem aqui no chat! 💭`;

      await supabase
        .from('messages')
        .insert({
          sender_id: adminUser.id,
          recipient_id: user.id,
          thread_type: 'welcome',
          body: firstMessage,
        });

      // Send second welcome message after a short delay
      setTimeout(async () => {
        const secondMessage = `Já agora, pra não dizeres que não ganhas nada com isto... vai à Tab "Recompensas" e vê as ofertas que tens disponíveis. Até já ! 🦇`;

        await supabase
          .from('messages')
          .insert({
            sender_id: adminUser.id,
            recipient_id: user.id,
            thread_type: 'welcome',
            body: secondMessage,
          });

        // Create notification about new messages
        await createNotification(
          user.id,
          'Mensagem de Boas-vindas',
          'Ghost Wayne enviou-te uma mensagem de boas-vindas!'
        );

      }, 2000); // 2 second delay

      // Create notification about enabling notifications
      setTimeout(async () => {
        await createNotification(
          user.id,
          'Ativar Notificações',
          'Ativa as notificações para ficares a par das ofertas!'
        );
      }, 5000); // 5 second delay

    } catch (error) {
      console.error('Error sending welcome messages:', error);
    }
  };

  useEffect(() => {
    // Check if this is a new user (created within last 5 minutes)
    if (user && profile) {
      const profileCreatedAt = new Date(profile.created_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (profileCreatedAt > fiveMinutesAgo) {
        // This is a new user, send welcome messages
        setTimeout(() => {
          sendWelcomeMessages();
        }, 1000); // Wait 1 second after login
      }
    }
  }, [user, profile]);

  return { sendWelcomeMessages };
};
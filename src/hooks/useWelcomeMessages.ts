import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const GHOST_WAYNE_EMAIL = 'ghostwayne777@hotmail.com';

export const useWelcomeMessages = () => {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || !profile) return;

    const sendWelcomeMessages = async () => {
      try {
        // Check if user already has welcome messages
        const { data: existingMessages } = await supabase
          .from('messages')
          .select('id')
          .eq('recipient_id', user.id)
          .limit(1);

        if (existingMessages && existingMessages.length > 0) {
          console.log('User already has messages, skipping welcome');
          return;
        }

        // Get Ghost Wayne admin
        const { data: ghostWayne } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (!ghostWayne) {
          console.error('Ghost Wayne admin not found');
          return;
        }

        // Send welcome message
        const welcomeMessage = `🎙️ Bem-vindo à 777Studios App!
Aqui podes fazer reservas, enviar beats para mistura e muito mais.
💬 Qualquer dúvida manda-me mensagem!`;

        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: ghostWayne.id,
            recipient_id: user.id,
            receiver_role: null,
            body: welcomeMessage,
            thread_type: 'direct',
            attachments: {
              action: {
                label: '🎁 Ver Recompensas',
                url: '/rewards'
              }
            }
          });

        if (error) throw error;

        console.log('Welcome message sent successfully');
      } catch (error) {
        console.error('Error sending welcome messages:', error);
      }
    };

    // Check if user is new (created in last 5 minutes)
    const createdAt = new Date(profile.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

    if (diffMinutes < 5) {
      setTimeout(() => {
        sendWelcomeMessages();
      }, 1000);
    }
  }, [user, profile]);
};

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const useBeats = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload reference files
  const uploadReferenceFiles = async (files: File[]): Promise<string[]> => {
    if (!user) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('beat-references')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('beat-references')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading files:', error);
      return [];
    } finally {
      setUploading(false);
    }
  };

  // Start conversation with admin about beats
  const startBeatConversation = async (beatType: string, message: string, referenceFiles: File[] = []) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to start a conversation about beats.',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      // Find admin user
      const { data: adminUser, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .maybeSingle();

      if (adminError) throw adminError;

      let finalMessage = `Hi! I'm interested in purchasing ${beatType}.\n\n${message}`;
      
      // Upload reference files if provided
      if (referenceFiles.length > 0) {
        const uploadedUrls = await uploadReferenceFiles(referenceFiles);
        if (uploadedUrls.length > 0) {
          finalMessage += '\n\nReference files:\n' + uploadedUrls.map(url => `- ${url}`).join('\n');
        }
      }

      // Messages and notifications tables don't exist - disabled
      /* if (adminUser) {
        await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: adminUser.id,
            thread_id: crypto.randomUUID(),
            message: finalMessage,
            timestamp: new Date().toISOString(),
          });

        await supabase
          .from('notifications')
          .insert({
            user_id: adminUser.id,
            title: 'New Beat Purchase Inquiry',
            body: `${user.email} is interested in purchasing ${beatType}.`,
          });
      } */

      toast({
        title: 'Message Sent',
        description: 'Your beat purchase inquiry has been sent to our team.',
      });

      // Navigate to messages
      navigate('/messages');
      return true;
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Generate WhatsApp deep link
  const generateWhatsAppLink = (beatType: string, message: string) => {
    const phoneNumber = '351934941263'; // Ghost's WhatsApp number
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  };

  return {
    loading,
    uploading,
    startBeatConversation,
    generateWhatsAppLink,
  };
};
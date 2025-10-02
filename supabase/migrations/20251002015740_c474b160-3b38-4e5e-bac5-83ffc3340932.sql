-- Atualizar mensagens existentes de utilizadores não-admin para usar inbox partilhado
-- Primeiro, identificar mensagens de utilizadores para admins
UPDATE messages
SET 
  receiver_role = 'admin',
  recipient_id = NULL
WHERE 
  sender_id IN (
    SELECT id FROM profiles WHERE role = 'client'
  )
  AND recipient_id IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
  AND receiver_role IS NULL;

-- Comentário explicativo
COMMENT ON COLUMN messages.receiver_role IS 'When set to admin, message is visible to all admins in shared inbox. When null, message is direct between sender and recipient.';
-- Adicionar coluna payment_method à tabela payment_requests
ALTER TABLE public.payment_requests
ADD COLUMN payment_method text;

COMMENT ON COLUMN public.payment_requests.payment_method IS 'Método de pagamento escolhido pelo cliente: mbway, transferencia, ou revolut';
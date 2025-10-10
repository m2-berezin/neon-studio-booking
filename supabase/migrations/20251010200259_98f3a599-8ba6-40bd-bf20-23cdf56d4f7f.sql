-- Remove the voucher discount trigger that's causing double discount application
DROP TRIGGER IF EXISTS apply_voucher_discount_trigger ON public.payment_requests;
DROP FUNCTION IF EXISTS public.apply_voucher_to_payment() CASCADE;
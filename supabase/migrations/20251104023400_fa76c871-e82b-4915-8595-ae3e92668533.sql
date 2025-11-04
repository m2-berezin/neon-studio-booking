-- Create trigger function to update points balance when transaction is inserted
CREATE OR REPLACE FUNCTION update_points_balance_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user's points balance
  UPDATE profiles
  SET points_balance = points_balance + NEW.amount,
      updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after insert on point_transactions
DROP TRIGGER IF EXISTS trigger_update_points_balance ON point_transactions;
CREATE TRIGGER trigger_update_points_balance
  AFTER INSERT ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_points_balance_on_transaction();
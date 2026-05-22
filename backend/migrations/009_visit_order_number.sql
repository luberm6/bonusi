-- Create a sequence starting from 1001
CREATE SEQUENCE IF NOT EXISTS visit_order_seq START 1001;

-- Add the new column with a default value that generates ZN-1001, ZN-1002, etc.
ALTER TABLE public.visits 
ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) UNIQUE 
DEFAULT 'ЗН-' || nextval('visit_order_seq');

-- Update any existing rows that might not have an order_number
UPDATE public.visits 
SET order_number = 'ЗН-' || nextval('visit_order_seq') 
WHERE order_number IS NULL;

-- Make it NOT NULL after backfilling
ALTER TABLE public.visits ALTER COLUMN order_number SET NOT NULL;

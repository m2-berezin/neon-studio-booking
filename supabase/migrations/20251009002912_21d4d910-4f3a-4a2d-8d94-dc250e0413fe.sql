-- Update service name from "MixMaster 1 projeto - 40EUR" to "Mix&Master"
UPDATE public.services 
SET name = 'Mix&Master',
    slug = 'mix-master'
WHERE id = 'd7a19079-7acd-4ccb-ac6c-7f7e68ac76a8';

UPDATE users
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE LOWER(email) = 'loolyyb@gmail.com'
  AND role IS DISTINCT FROM 'admin';

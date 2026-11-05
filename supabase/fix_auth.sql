update auth.users
set
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    email_change = coalesce(email_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    phone_change = coalesce(phone_change, ''),
    reauthentication_token = coalesce(reauthentication_token, ''),
    is_super_admin = coalesce(is_super_admin, false);

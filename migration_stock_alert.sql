-- ============================================================
-- RPC: insert_order_stock_alert
-- Called by the Stripe webhook (anon key) when stock deduction
-- fails after payment. Inserts a STOCK_ISSUE note into the
-- order_status_history so the admin can see the alert.
-- ============================================================

CREATE OR REPLACE FUNCTION insert_order_stock_alert(
    p_order_id UUID,
    p_notes    TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO order_status_history (
        order_id,
        from_status,
        to_status,
        changed_by_type,
        notes,
        created_at
    )
    SELECT
        p_order_id,
        o.status,
        o.status,          -- status unchanged, this is only an informational note
        'system',
        p_notes,
        NOW()
    FROM orders o
    WHERE o.id = p_order_id;
END;
$$;

-- Allow anon (webhook) and authenticated to call this
GRANT EXECUTE ON FUNCTION insert_order_stock_alert(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION insert_order_stock_alert(UUID, TEXT) TO authenticated;

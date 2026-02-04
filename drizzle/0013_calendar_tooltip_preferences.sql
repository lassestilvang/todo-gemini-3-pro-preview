DO $$
BEGIN
    ALTER TABLE "users" ADD COLUMN "calendar_use_native_tooltips_on_dense_days" boolean;
    ALTER TABLE "users" ADD COLUMN "calendar_dense_tooltip_threshold" integer;
END $$;

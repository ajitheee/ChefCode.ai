-- ============================================================
--  ChefCode.cc — Supabase Database Migration
--  Paste this entire file into: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLE 1: organizations  (one row per paying customer)
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                   TEXT NOT NULL,
  type                   TEXT CHECK (type IN ('hotel','restaurant','university','hospital','other')) DEFAULT 'restaurant',
  plan                   TEXT CHECK (plan IN ('starter','professional','enterprise')) DEFAULT 'starter',
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  max_locations          INT  DEFAULT 1,
  max_users              INT  DEFAULT 3,
  is_active              BOOLEAN DEFAULT TRUE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 2: locations  (multiple per org)
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  address                 TEXT,
  city                    TEXT,
  state                   TEXT,
  price_spike_threshold   DECIMAL(5,2) DEFAULT 10.00,
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 3: profiles  (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID REFERENCES organizations(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id)    ON DELETE SET NULL,
  full_name   TEXT,
  role        TEXT CHECK (role IN ('owner','manager','chef','viewer')) DEFAULT 'chef',
  invited_by  UUID,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 4: gl_codes  (per org — customisable chart of accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS gl_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT,
  type        TEXT CHECK (type IN ('food','non_food')) DEFAULT 'food',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 5: vendors  (per org — replaces hardcoded if/else chains)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  canonical_name  TEXT NOT NULL,
  aliases         TEXT[] DEFAULT '{}',
  type            TEXT CHECK (type IN ('food','non_food','both')) DEFAULT 'food',
  account_number  TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 6: products  (org_id = NULL → global shared template)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL = global
  product_number TEXT,
  description    TEXT NOT NULL,
  category       TEXT,
  gl_code        TEXT,
  vendor_id      UUID REFERENCES vendors(id) ON DELETE SET NULL,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 7: invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id      UUID REFERENCES locations(id) ON DELETE SET NULL,
  processed_by     UUID REFERENCES profiles(id)  ON DELETE SET NULL,
  vendor_id        UUID REFERENCES vendors(id)   ON DELETE SET NULL,
  vendor_name      TEXT,
  invoice_number   TEXT,
  invoice_date     DATE,
  total_amount     DECIMAL(10,2),
  delivery_address TEXT,
  status           TEXT CHECK (status IN ('draft','review','approved','exported')) DEFAULT 'review',
  image_url        TEXT,
  is_duplicate     BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 8: invoice_items
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id         UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id         UUID REFERENCES products(id) ON DELETE SET NULL,
  description        TEXT,
  product_number     TEXT,
  quantity           DECIMAL(10,3),
  unit_price         DECIMAL(10,4),
  total_price        DECIMAL(10,2),
  gl_code            TEXT,
  category_name      TEXT,
  ai_confidence      DECIMAL(3,2),
  is_database_match  BOOLEAN DEFAULT FALSE,
  price_spike        BOOLEAN DEFAULT FALSE,
  historical_price   DECIMAL(10,4),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 9: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id)  ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id)  ON DELETE SET NULL,
  action     TEXT NOT NULL,
  old_value  JSONB,
  new_value  JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- INDEXES  (for fast multi-tenant queries)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_locations_org_id        ON locations(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id          ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_gl_codes_org_id          ON gl_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_vendors_org_id           ON vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_products_org_id          ON products(org_id);
CREATE INDEX IF NOT EXISTS idx_products_number          ON products(product_number);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id          ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_location_id     ON invoices(location_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number          ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_org_id     ON invoice_items(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id        ON audit_logs(org_id);


-- ============================================================
-- ROW LEVEL SECURITY  (data isolation between tenants)
-- ============================================================
ALTER TABLE organizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;


-- Helper: get the current user's org_id
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$;

-- Helper: get the current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;


-- organizations
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (id = get_my_org_id());

CREATE POLICY "org_update_owner" ON organizations
  FOR UPDATE USING (id = get_my_org_id() AND get_my_role() = 'owner');

-- locations
CREATE POLICY "loc_select" ON locations
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "loc_all_owner_mgr" ON locations
  FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('owner','manager'));

-- profiles
CREATE POLICY "profile_select_teammates" ON profiles
  FOR SELECT USING (org_id = get_my_org_id());

-- A user may edit their own profile, but role + org_id are frozen once set
-- (the first NULL->value claim at signup is still allowed). Without the
-- WITH CHECK, a user could self-promote to owner or hop into another tenant.
CREATE POLICY "profile_update_self" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (org_id IS NOT DISTINCT FROM get_my_org_id() OR get_my_org_id() IS NULL)
    AND (role = get_my_role() OR get_my_org_id() IS NULL)
  );

-- Self-insert may only create a benign unclaimed profile; org_id/role are
-- claimed later via the (frozen) update path or set by the signup trigger.
CREATE POLICY "profile_insert_self" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid() AND org_id IS NULL AND role = 'chef');

-- gl_codes
CREATE POLICY "gl_select" ON gl_codes
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "gl_all_owner_mgr" ON gl_codes
  FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('owner','manager'));

-- vendors
CREATE POLICY "vendor_select" ON vendors
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "vendor_all_owner_mgr" ON vendors
  FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('owner','manager'));

-- products: org's own + global (org_id IS NULL)
CREATE POLICY "product_select" ON products
  FOR SELECT USING (org_id = get_my_org_id() OR org_id IS NULL);

CREATE POLICY "product_insert_chef_up" ON products
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "product_update_owner_mgr" ON products
  FOR UPDATE USING (org_id = get_my_org_id() AND get_my_role() IN ('owner','manager'));

-- invoices
CREATE POLICY "inv_select" ON invoices
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "inv_insert" ON invoices
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "inv_update" ON invoices
  FOR UPDATE USING (org_id = get_my_org_id());

CREATE POLICY "inv_delete_owner_mgr" ON invoices
  FOR DELETE USING (org_id = get_my_org_id() AND get_my_role() IN ('owner','manager'));

-- invoice_items
CREATE POLICY "invitem_select" ON invoice_items
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "invitem_all" ON invoice_items
  FOR ALL USING (org_id = get_my_org_id());

-- audit_logs
CREATE POLICY "audit_select" ON audit_logs
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "audit_insert" ON audit_logs
  FOR INSERT WITH CHECK (org_id = get_my_org_id());


-- ============================================================
-- TRIGGER: auto-create profile row when user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- FUNCTION: seed default GL codes + vendors when a new org is created
-- ============================================================
CREATE OR REPLACE FUNCTION seed_org_defaults(p_org_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- GL Codes (from your existing constants.ts)
  INSERT INTO gl_codes (org_id, code, category, description, type) VALUES
    (p_org_id, '6321', 'Meats',                'Beef, Pork, Lamb, etc.',           'food'),
    (p_org_id, '6322', 'Groceries',            'Dry goods, spices, canned items',  'food'),
    (p_org_id, '6323', 'Produce',              'Fruits, Vegetables',               'food'),
    (p_org_id, '6324', 'Bakery',               'Bread, Pastries, Flour',           'food'),
    (p_org_id, '6325', 'Dairy',                'Milk, Cheese, Butter, Eggs',       'food'),
    (p_org_id, '6326', 'Beverages',            'Soft drinks, Juice, Water',        'food'),
    (p_org_id, '6327', 'Seafood',              'Fish, Shellfish',                  'food'),
    (p_org_id, '6328', 'Poultry',              'Chicken, Turkey, Duck',            'food'),
    (p_org_id, '6318', 'Ice Cream / Frozen',   'Frozen desserts, Ice cream, Coffee','food'),
    (p_org_id, '7326', 'Expendable Items',     'Paper goods, disposables',         'non_food'),
    (p_org_id, '7327', 'Non-expendable Items', 'Smallwares, equipment',            'non_food'),
    (p_org_id, '7332', 'Chemicals',            'Cleaning supplies, detergents',    'non_food'),
    (p_org_id, '7171', 'Software/Subscription','SaaS, Monthly services',           'non_food'),
    (p_org_id, '7155', 'Laundry',              'Linens, Uniform cleaning',         'non_food');

  -- Vendors (from your existing constants.ts)
  INSERT INTO vendors (org_id, canonical_name, aliases, type) VALUES
    (p_org_id, 'Sysco',                ARRAY['SYSCO','sysco corporation'],                    'both'),
    (p_org_id, 'US Foods',             ARRAY['US FOOD','USFood','usfood'],                    'food'),
    (p_org_id, 'SunRise Produce',      ARRAY['Sunrise','sunrise produce'],                    'food'),
    (p_org_id, 'Performance Food',     ARRAY['Performance','PFG'],                            'food'),
    (p_org_id, 'Freshpoint',           ARRAY['fresh point','freshpoint inc'],                 'food'),
    (p_org_id, 'Giulianos Bakery',     ARRAY['giuliano','giulianos'],                         'food'),
    (p_org_id, 'Bon Suisse',           ARRAY['bon suisse'],                                   'food'),
    (p_org_id, 'Wismettac',            ARRAY['wismettac'],                                    'food'),
    (p_org_id, 'Freshpoint',           ARRAY['freshpoint'],                                   'food'),
    (p_org_id, 'Unistar Foods',        ARRAY['unistar'],                                      'food'),
    (p_org_id, 'Southern Glazers',     ARRAY['southern glazer','reliant','reliant coffee'],   'food'),
    (p_org_id, 'Karat By Lollicup',    ARRAY['karat','lollicup'],                             'both'),
    (p_org_id, 'Cali Dumpling',        ARRAY['cali dumpling','raindrop'],                     'food'),
    (p_org_id, 'Pepsi',                ARRAY['pepsi co','pepsico'],                           'food'),
    (p_org_id, 'IFS Food Services',    ARRAY['ifs','ifs food'],                               'both'),
    (p_org_id, 'South Shore',          ARRAY['south shore','core mark'],                      'both'),
    (p_org_id, 'Eco Lab',              ARRAY['ecolab','eco-lab'],                             'non_food'),
    (p_org_id, 'Cintas',               ARRAY['CINTAS','cintas corp'],                         'non_food'),
    (p_org_id, 'Airgas',               ARRAY['airgas'],                                       'non_food'),
    (p_org_id, 'Prudential',           ARRAY['prudential'],                                   'non_food'),
    (p_org_id, 'All Sharpened Knives', ARRAY['sharpened'],                                    'non_food'),
    (p_org_id, 'Dallas Bros',          ARRAY['dallas'],                                       'non_food'),
    (p_org_id, 'Whirley Drink Works',  ARRAY['whirley'],                                      'non_food'),
    (p_org_id, 'Calico',               ARRAY['calico'],                                       'non_food');
END;
$$;

-- Trigger: auto-seed when a new org is created
CREATE OR REPLACE FUNCTION on_org_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM seed_org_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_org_created ON organizations;
CREATE TRIGGER trigger_org_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION on_org_created();


-- ============================================================
-- SEED: Global product database (org_id = NULL — shared for all orgs)
-- Migrated from your MASTER_PRODUCT_DB in constants.ts
-- ============================================================
INSERT INTO products (org_id, product_number, description, category, gl_code) VALUES
  (NULL, '483920', 'Roma Tomatoes, fresh',         'Produce',         '6323'),
  (NULL, '195674', 'Iceberg Lettuce',               'Produce',         '6323'),
  (NULL, '728450', 'Yellow Onions 25 lb',           'Produce',         '6323'),
  (NULL, '441287', 'Cucumbers, fresh',              'Produce',         '6323'),
  (NULL, '390615', 'Lemons 40 ct',                  'Produce',         '6323'),
  (NULL, '560183', 'Chicken Breast, boneless',      'Poultry',         '6328'),
  (NULL, '770214', 'Chicken Breast, boneless',      'Poultry',         '6328'),
  (NULL, '681509', 'Chicken Thighs, boneless',      'Poultry',         '6328'),
  (NULL, '946372', 'Whole Chicken, fryer',           'Poultry',         '6328'),
  (NULL, '215907', 'Turkey Breast, deli',            'Poultry',         '6328'),
  (NULL, '504611', 'Chicken Wings, jumbo',           'Poultry',         '6328'),
  (NULL, '614972', 'Ground Beef 80/20',              'Meats',           '6321'),
  (NULL, '702416', 'Pork Shoulder, boneless',        'Meats',           '6321'),
  (NULL, '330951', 'Bacon, sliced 10 lb',            'Meats',           '6321'),
  (NULL, '588104', 'Beef Meatballs, cooked',         'Meats',           '6321'),
  (NULL, '309581', 'Tilapia Fillet, frozen',         'Seafood',         '6327'),
  (NULL, '420916', 'Shrimp 26/30, peeled',           'Seafood',         '6327'),
  (NULL, '516230', 'Salmon portions 6 oz',           'Seafood',         '6327'),
  (NULL, '804195', 'Crab meat, pasteurized',         'Seafood',         '6327'),
  (NULL, '673108', 'Cod fillet, frozen',             'Seafood',         '6327'),
  (NULL, '85219',  'Whole Milk 1 gal',               'Dairy',           '6325'),
  (NULL, '402771', 'Cheddar Cheese Shred',           'Dairy',           '6325'),
  (NULL, '175408', 'Butter, salted 1 lb',            'Dairy',           '6325'),
  (NULL, '690321', 'Heavy Cream 1 qt',               'Dairy',           '6325'),
  (NULL, '281734', 'Yogurt, plain 5 lb',             'Dairy',           '6325'),
  (NULL, '917406', 'Burger Buns 4"',                 'Bakery',          '6324'),
  (NULL, '602193', 'Sandwich Bread, white',          'Bakery',          '6324'),
  (NULL, '745109', 'Tortillas 10" flour',            'Bakery',          '6324'),
  (NULL, '118507', 'Croissants, frozen bake',        'Bakery',          '6324'),
  (NULL, '930116', 'Dinner Rolls, 2 oz',             'Bakery',          '6324'),
  (NULL, '275810', 'Basmati Rice 25 lb',             'Groceries',       '6322'),
  (NULL, '661503', 'Pasta Penne 5 lb',               'Groceries',       '6322'),
  (NULL, '920615', 'Tomato Ketchup 1 gal',           'Groceries',       '6322'),
  (NULL, '118604', 'Mayonnaise 1 gal',               'Groceries',       '6322'),
  (NULL, '597310', 'Black Pepper 18 oz',             'Groceries',       '6322'),
  (NULL, '240917', 'Chili Powder 16 oz',             'Groceries',       '6322'),
  (NULL, '675208', 'Canola Oil 35 lb',               'Groceries',       '6322'),
  (NULL, '540882', 'Canned Tomatoes #10',            'Groceries',       '6322'),
  (NULL, '310769', 'Black Beans #10',                'Groceries',       '6322'),
  (NULL, '889014', 'All-Purpose Flour 50 lb',        'Groceries',       '6322'),
  (NULL, '146298', 'Orange Juice 1 gal',             'Beverages',       '6326'),
  (NULL, '734051', 'Soda Assorted 12 oz cans',       'Beverages',       '6326'),
  (NULL, '981204', 'Bottled Water 16.9 oz',          'Beverages',       '6326'),
  (NULL, '504982', 'French Fries 6/5 lb',            'Frozen',          '6318'),
  (NULL, '883170', 'Mixed Veggies 5 lb',             'Frozen',          '6318'),
  (NULL, '771605', 'Ice Cream Vanilla 3 gal',        'Frozen',          '6318'),
  (NULL, '229840', 'Frozen Pizza Cheese 12"',        'Frozen',          '6318'),
  (NULL, '615330', 'Coffee Beans, dark roast 5 lb',  'Frozen',          '6318'),
  (NULL, '531904', 'Napkins, dinner',                'Expendable Items','7326'),
  (NULL, '410296', 'Paper Cups 12 oz',               'Expendable Items','7326'),
  (NULL, '793105', 'Paper Towels',                   'Expendable Items','7326'),
  (NULL, '905381', 'Food Gloves (L)',                'Expendable Items','7326'),
  (NULL, '862415', 'Takeout Containers 3-comp',      'Non-Expendable',  '7327'),
  (NULL, '374602', 'Aluminum Foil Roll',             'Non-Expendable',  '7327'),
  (NULL, '680247', 'Dishwashing Liquid 1 gal',       'Chemicals',       '7332'),
  (NULL, '225916', 'Sanitizer (Quat)',               'Chemicals',       '7332'),
  (NULL, '650319', 'Laundry Detergent, commercial',  'Laundry',         '7155')
ON CONFLICT DO NOTHING;


-- ============================================================
-- Done! Your ChefCode database is ready.
-- Next step: go to your Supabase project → Authentication →
-- Providers and enable Email sign-in.
-- ============================================================

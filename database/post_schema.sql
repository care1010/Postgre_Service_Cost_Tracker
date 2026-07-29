-- =====================================================================
-- 1. TRIGGER FUNCTION (For Auto-Updating 'updated_at' column)
-- =====================================================================
CREATE OR REPLACE FUNCTION update_modified_column()   
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;   
END;
$$ language 'plpgsql';


-- =====================================================================
-- 2. TABLES CREATION (Strict PostgreSQL Syntax)
-- =====================================================================

CREATE TABLE access (
  id SERIAL PRIMARY KEY,
  customer VARCHAR(255),
  email VARCHAR(255)
);

CREATE TABLE cj74_new (
  id SERIAL PRIMARY KEY,
  year INT,
  per VARCHAR(255),
  cocd VARCHAR(255),
  proj_def VARCHAR(255),
  object_1 VARCHAR(255),
  profit_ctr VARCHAR(255),
  name2 VARCHAR(255),
  tcurr TEXT,
  value_trancurr NUMERIC(18,2),
  obcur VARCHAR(255),
  val_in_obj_crcy NUMERIC(18,2),
  val_in_rc NUMERIC(18,2),
  rcurr VARCHAR(255),
  cost_element VARCHAR(255),
  cost_element_name VARCHAR(255),
  cost_element_descr VARCHAR(255),
  refdocno VARCHAR(255),
  document_no VARCHAR(255),
  doc_date DATE,
  postg_date DATE,
  offst_acct VARCHAR(255),
  name_of_offsetting_account VARCHAR(255),
  object_2 VARCHAR(255),
  material VARCHAR(255),
  material_description VARCHAR(255),
  name1 VARCHAR(255),
  name22 VARCHAR(255),
  created_on DATE,
  frm VARCHAR(255),
  user_name VARCHAR(255),
  object_3 VARCHAR(255),
  co_object_name VARCHAR(255),
  pur_doc VARCHAR(255),
  quantity NUMERIC(18,3),
  purchase_order_text VARCHAR(255)
);

CREATE TABLE cji5_new (
  id SERIAL PRIMARY KEY,
  project_def VARCHAR(255),
  wbs_element VARCHAR(255),
  refdocno VARCHAR(255),
  item VARCHAR(255),
  co_object_name VARCHAR(255),
  supplier VARCHAR(255),
  name VARCHAR(255),
  exch_rate NUMERIC(18,6),
  year INT,
  per VARCHAR(255),
  cost_element VARCHAR(255),
  cost_element_descr VARCHAR(255),
  matl_group VARCHAR(255),
  material VARCHAR(255),
  description VARCHAR(255),
  user_name VARCHAR(255),
  docc VARCHAR(255),
  quantity NUMERIC(18,3),
  qty_plan NUMERIC(18,3),
  debit_date DATE,
  doc_date DATE,
  cocode VARCHAR(255),
  report_currency VARCHAR(255),
  val_in_rep_cur NUMERIC(18,2),
  tcurr TEXT,
  value_tcur NUMERIC(18,2),
  obj_curr VARCHAR(255),
  value_in_obj_crcy NUMERIC(18,2)
);

CREATE TABLE cost_mapping (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100),
  cost_element_group_name VARCHAR(255),
  cost_element VARCHAR(100),
  cost_element_name VARCHAR(255),
  cost_element_desc TEXT,
  cost_revenue VARCHAR(50),
  categories VARCHAR(100)
);

CREATE TABLE customer (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(100),
  is_active SMALLINT
);

CREATE TABLE erp_resource (
  id SERIAL PRIMARY KEY,
  tr_global_period VARCHAR(50),
  lm_nokia_id_name VARCHAR(255),
  home_country VARCHAR(100),
  resource_erp_type VARCHAR(100),
  resource_person_number VARCHAR(50),
  resource_nokia_id_name VARCHAR(255),
  time_entry_date DATE,
  recorded_hours NUMERIC(5,2),
  time_entry_status VARCHAR(50),
  daily_working_hours NUMERIC(5,2),
  tr_wbs_care_contract_opp VARCHAR(255),
  tr_wbs_care_contract_opp_description TEXT,
  svo_id VARCHAR(100),
  svo_description TEXT,
  gic VARCHAR(100),
  gic_name VARCHAR(255),
  customer_team VARCHAR(255),
  time_approval_date DATE,
  lm_email VARCHAR(255),
  resource_email VARCHAR(255),
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  month VARCHAR(20),
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE final_dashboard_table (
  id TEXT,
  bu VARCHAR(100),
  customer VARCHAR(255),
  loa_id VARCHAR(100),
  loa_name VARCHAR(255),
  cost_revenue VARCHAR(100),
  categories VARCHAR(100),
  merged_wbs TEXT,
  active_inactive VARCHAR(50),
  asbl NUMERIC(15,2),
  asbl_amc NUMERIC(15,2),
  asbl_project NUMERIC(15,2),
  asbl_warranty NUMERIC(15,2),
  asbl_loa NUMERIC(15,2),
  non_committed NUMERIC(15,2),
  non_committed_amc NUMERIC(15,2),
  non_committed_project NUMERIC(15,2),
  non_committed_warranty NUMERIC(15,2),
  non_committed_editable NUMERIC(15,2),
  non_committed_editable_amc NUMERIC(15,2),
  non_committed_editable_project NUMERIC(15,2),
  non_committed_editable_warranty NUMERIC(15,2),
  period VARCHAR(20),
  ptd NUMERIC(15,2),
  wbs_element_single VARCHAR(255),
  wbs_type VARCHAR(100),
  wbs_description TEXT,
  "open_commitment_KEUR" NUMERIC(15,2),
  eac NUMERIC(20,3),
  eac_vs_asbl NUMERIC(20,3),
  "Merged_wbs_categories" TEXT, 
  updated_by VARCHAR(100),
  updated_at TIMESTAMP
);

CREATE TABLE master_categories (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL,
  cost_revenue_type VARCHAR(50) NOT NULL
);

CREATE TABLE master_cost_element (
  id SERIAL PRIMARY KEY,
  cost_element VARCHAR(255) NOT NULL,
  cost_mapping VARCHAR(255)
);

CREATE TABLE summary (
  id SERIAL PRIMARY KEY,
  bu VARCHAR(255),
  customer VARCHAR(255),
  loa_id VARCHAR(255),
  loa_name VARCHAR(255),
  cost_revenue VARCHAR(255),
  categories VARCHAR(255),
  merged_wbs TEXT,
  "Merged_wbs_category" TEXT,
  active_inactive VARCHAR(255) DEFAULT 'Active',
  asbl NUMERIC(15,3) DEFAULT 0.000,
  asbl_amc NUMERIC(15,3) DEFAULT 0.000,
  asbl_project NUMERIC(15,3) DEFAULT 0.000,
  asbl_warranty NUMERIC(15,3) DEFAULT 0.000,
  asbl_loa NUMERIC(15,3) DEFAULT 0.000,
  ptd NUMERIC(15,3) DEFAULT 0.000,
  "open_commitment_KEUR" NUMERIC(15,3) DEFAULT 0.000,
  non_committed NUMERIC(15,3) DEFAULT 0.000,
  non_committed_amc NUMERIC(15,3) DEFAULT 0.000,
  non_committed_project NUMERIC(15,3) DEFAULT 0.000,
  non_committed_warranty NUMERIC(15,3) DEFAULT 0.000,
  eac NUMERIC(15,3) DEFAULT 0.000,
  eac_vs_asbl NUMERIC(15,3) DEFAULT 0.000,
  non_committed_editable NUMERIC(15,3) DEFAULT 0.000,
  non_committed_editable_amc NUMERIC(15,3) DEFAULT 0.000,
  non_committed_editable_project NUMERIC(15,3) DEFAULT 0.000,
  non_committed_editable_warranty NUMERIC(15,3) DEFAULT 0.000,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to auto-update 'updated_at' in summary table
CREATE TRIGGER update_summary_modtime
BEFORE UPDATE ON summary
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE temp (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  row_id VARCHAR(500) NOT NULL,
  non_commited NUMERIC(10,2),
  original_non_commited NUMERIC(10,2),
  timestamp TIMESTAMP NOT NULL
);

-- Note: In PG, tables that get TRUNCATED/INSERTED directly from aggregations 
-- don't typically need SERIAL PRIMARY KEY if the ID is mapped directly from source. 
-- Kept as INT for Drilldown tables to match exact data pull logic.
CREATE TABLE t_cj74_transformed (
  id INT NOT NULL,
  sap_wbs VARCHAR(100),
  year INT,
  per INT,
  cost_element VARCHAR(255),
  cost_element_name VARCHAR(255),
  ptd_val NUMERIC(19,6),
  period VARCHAR(20),
  cocd VARCHAR(255),
  proj_def VARCHAR(255),
  profit_ctr VARCHAR(255),
  name2 VARCHAR(255),
  tcurr VARCHAR(255),
  value_trancurr NUMERIC(18,2),
  obcur VARCHAR(255),
  val_in_obj_crcy NUMERIC(18,2),
  val_in_rc NUMERIC(18,2),
  rcurr VARCHAR(10),
  cost_element_descr VARCHAR(255),
  refdocno VARCHAR(100),
  document_no VARCHAR(100),
  doc_date DATE,
  postg_date DATE,
  offst_acct VARCHAR(100),
  name_of_offsetting_account VARCHAR(255),
  material VARCHAR(100),
  material_description VARCHAR(255),
  name1 VARCHAR(255),
  name22 VARCHAR(255),
  created_on DATE,
  origin_form VARCHAR(100),
  user_name VARCHAR(100),
  pur_doc VARCHAR(100),
  quantity NUMERIC(18,3),
  purchase_order_text VARCHAR(100),
  loa_id VARCHAR(100),
  wbs_string TEXT,
  wbs_type VARCHAR(100),
  wbs_description VARCHAR(255),
  categories VARCHAR(255),
  cost_revenue VARCHAR(255)
);

CREATE TABLE t_cji5_transformed (
  id INT NOT NULL,
  project_def VARCHAR(255),
  sap_wbs VARCHAR(255),
  refdocno VARCHAR(255),
  item VARCHAR(255),
  co_object_name VARCHAR(255),
  supplier VARCHAR(255),
  name VARCHAR(255),
  exch_rate NUMERIC(18,6),
  year INT,
  per VARCHAR(255),
  cost_element VARCHAR(255),
  cost_element_descr VARCHAR(255),
  matl_group VARCHAR(255),
  material VARCHAR(255),
  description VARCHAR(255),
  user_name VARCHAR(255),
  docc VARCHAR(255),
  quantity NUMERIC(18,3),
  qty_plan NUMERIC(18,3),
  debit_date DATE,
  doc_date DATE,
  cocode VARCHAR(255),
  report_currency VARCHAR(255),
  val_in_rep_cur NUMERIC(18,2),
  tcurr TEXT,
  value_tcur NUMERIC(18,2),
  obj_curr VARCHAR(255),
  value_in_obj_crcy NUMERIC(18,2),
  oc_val NUMERIC(19,6),
  loa_id VARCHAR(255),
  wbs_type VARCHAR(255),
  categories VARCHAR(255)
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  type VARCHAR(255),
  is_active VARCHAR(255) DEFAULT '1',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE user_activity_logs (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255),
  bu VARCHAR(10),
  customer VARCHAR(255),
  loa_name VARCHAR(255),
  loa_id VARCHAR(20),
  categories VARCHAR(255),
  old_value NUMERIC(18,2),
  new_value NUMERIC(18,2),
  month_year VARCHAR(20),
  wbs_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active_inactive VARCHAR(20)
);

CREATE TABLE wbs_loa_id_mapping1 (
  id SERIAL PRIMARY KEY,
  bu VARCHAR(100),
  customer VARCHAR(255),
  loa_id VARCHAR(100),
  loa_name VARCHAR(255),
  wbs_type VARCHAR(100),
  single_wbs VARCHAR(255),
  wbs_description TEXT,
  merged_wbs TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 3. INDEXES (Optimized for Postgres)
-- =====================================================================

CREATE INDEX idx_cj74_object_1 ON cj74_new (object_1);
CREATE INDEX idx_cj74_cost_element ON cj74_new (cost_element);

CREATE INDEX idx_cost_mapping_element ON cost_mapping (cost_element);

CREATE INDEX idx_erp_period ON erp_resource (tr_global_period);
CREATE INDEX idx_erp_lm ON erp_resource (lm_nokia_id_name);
CREATE INDEX idx_erp_country ON erp_resource (home_country);
CREATE INDEX idx_erp_wbs ON erp_resource (tr_wbs_care_contract_opp);

CREATE INDEX idx_fdt_bu ON final_dashboard_table (bu);
CREATE INDEX idx_fdt_loa_id ON final_dashboard_table (loa_id);
CREATE INDEX idx_fdt_merged_wbs_cat ON final_dashboard_table ("Merged_wbs_categories");
CREATE INDEX idx_fdt_cat ON final_dashboard_table (categories);
CREATE INDEX idx_fdt_wbs_type ON final_dashboard_table (wbs_type);

CREATE INDEX idx_master_ce ON master_cost_element (cost_element);

CREATE INDEX idx_summary_loa_cat ON summary (loa_id, categories);
CREATE INDEX idx_summary_merged_cat ON summary ("Merged_wbs_category");

CREATE INDEX idx_wbs_bu ON wbs_loa_id_mapping1 (bu);
CREATE INDEX idx_wbs_customer ON wbs_loa_id_mapping1 (customer);
CREATE INDEX idx_wbs_loa_id ON wbs_loa_id_mapping1 (loa_id);
CREATE INDEX idx_wbs_loa_name ON wbs_loa_id_mapping1 (loa_name);
CREATE INDEX idx_wbs_single ON wbs_loa_id_mapping1 (single_wbs);


-- =====================================================================
-- 4. VIEWS (100% Pure PostgreSQL Logic)
-- =====================================================================

CREATE OR REPLACE VIEW join_summary AS 
SELECT 
    s.id::TEXT AS id, 
    TRIM(s.bu) AS bu, 
    TRIM(s.customer) AS customer, 
    TRIM(s.loa_id) AS loa_id, 
    TRIM(s.loa_name) AS loa_name, 
    TRIM(s.cost_revenue) AS cost_revenue, 
    TRIM(REPLACE(TRIM(s.categories), '  ', ' ')) AS categories, 
    TRIM(s.merged_wbs) AS merged_wbs, 
    TRIM(s.active_inactive) AS active_inactive, 
    
    -- 🔥 FIX: Removed TRIM() and ::TEXT from all Numeric Columns
    s.asbl AS asbl, 
    s.asbl_amc AS asbl_amc, 
    s.asbl_project AS asbl_project, 
    s.asbl_warranty AS asbl_warranty, 
    s.asbl_loa AS asbl_loa, 
    s.non_committed AS non_committed, 
    s.non_committed_amc AS non_committed_amc, 
    s.non_committed_project AS non_committed_project, 
    s.non_committed_warranty AS non_committed_warranty, 
    s.non_committed_editable AS non_committed_editable, 
    s.non_committed_editable_amc AS non_committed_editable_amc, 
    s.non_committed_editable_project AS non_committed_editable_project, 
    s.non_committed_editable_warranty AS non_committed_editable_warranty, 
    s.ptd AS ptd_old, 
    s.open_commitment_KEUR AS oc_old, 
    
    TRIM(s.updated_by) AS updated_by, 
    s.updated_at AS updated_at, 
    COALESCE(
        NULLIF(TRIM(s."Merged_wbs_category"), ''), 
        CASE 
            WHEN TRIM(s.merged_wbs) <> '' AND TRIM(s.categories) <> '' 
            THEN CONCAT(TRIM(s.merged_wbs), '-', TRIM(REPLACE(TRIM(s.categories), '  ', ' '))) 
            ELSE NULL 
        END
    ) AS "Merged_wbs_categories" 
FROM summary s;

CREATE OR REPLACE VIEW v_cj74_transformed AS 
SELECT 
    c.id AS id, c.year AS year, c.per AS per, c.cocd AS cocd, c.proj_def AS proj_def, 
    c.object_1 AS object_1, c.profit_ctr AS profit_ctr, c.name2 AS name2, c.tcurr AS tcurr, 
    c.value_trancurr AS value_trancurr, c.obcur AS obcur, c.val_in_obj_crcy AS val_in_obj_crcy, 
    c.val_in_rc AS val_in_rc, c.rcurr AS rcurr, c.cost_element AS cost_element, 
    c.cost_element_name AS cost_element_name, c.cost_element_descr AS cost_element_descr, 
    c.refdocno AS refdocno, c.document_no AS document_no, c.doc_date AS doc_date, 
    c.postg_date AS postg_date, c.offst_acct AS offst_acct, c.name_of_offsetting_account AS name_of_offsetting_account, 
    c.object_2 AS object_2, c.material AS material, c.material_description AS material_description, 
    c.name1 AS name1, c.name22 AS name22, c.created_on AS created_on, c.frm AS frm, 
    c.user_name AS user_name, c.object_3 AS object_3, c.co_object_name AS co_object_name, 
    c.pur_doc AS pur_doc, c.quantity AS quantity, c.purchase_order_text AS purchase_order_text, 
    TRIM(REPLACE(REPLACE(REPLACE(c.object_1, ' ', ''), CHR(10), ''), CHR(13), '')) AS single_wbs, 
    CAST(c.val_in_rc AS NUMERIC(15,2)) / 1000 AS ptd_val, 
    TRIM(CONCAT(c.year, '-P', LPAD(TRIM(c.per), 3, '0'))) AS period, 
    TRIM(w.loa_id) AS loa_id, TRIM(w.merged_wbs) AS merged_wbs, 
    TRIM(w.wbs_type) AS wbs_type, TRIM(w.wbs_description) AS wbs_description, 
    TRIM(REPLACE(cm.categories, '  ', ' ')) AS categories, 
    TRIM(COALESCE(w.bu, s.bu)) AS bu, TRIM(COALESCE(w.customer, s.customer)) AS customer, 
    TRIM(COALESCE(w.loa_name, s.loa_name)) AS loa_name, 
    TRIM(CONCAT(COALESCE(TRIM(w.merged_wbs), ''), '-', COALESCE(TRIM(REPLACE(cm.categories, '  ', ' ')), ''))) AS "Merged_wbs_categories" 
FROM cj74_new c 
LEFT JOIN (
    SELECT 
        UPPER(TRIM(REPLACE(REPLACE(REPLACE(single_wbs, ' ', ''), CHR(10), ''), CHR(13), ''))) AS clean_single_wbs,
        MAX(bu) AS bu, MAX(customer) AS customer, MAX(loa_id) AS loa_id, MAX(loa_name) AS loa_name,
        MAX(merged_wbs) AS merged_wbs, MAX(wbs_type) AS wbs_type, MAX(wbs_description) AS wbs_description 
    FROM wbs_loa_id_mapping1 
    GROUP BY UPPER(TRIM(REPLACE(REPLACE(REPLACE(single_wbs, ' ', ''), CHR(10), ''), CHR(13), '')))
) w ON UPPER(TRIM(REPLACE(REPLACE(REPLACE(c.object_1, ' ', ''), CHR(10), ''), CHR(13), ''))) = w.clean_single_wbs 
LEFT JOIN (
    SELECT cost_element, MAX(categories) AS categories 
    FROM cost_mapping 
    GROUP BY cost_element
) cm ON TRIM(c.cost_element) = TRIM(cm.cost_element) 
LEFT JOIN summary s ON TRIM(w.merged_wbs) = TRIM(s.merged_wbs);

CREATE OR REPLACE VIEW v_cji5_transformed AS 
SELECT 
    c.id AS id, c.project_def AS project_def, c.wbs_element AS wbs_element, 
    c.refdocno AS refdocno, c.item AS item, c.co_object_name AS co_object_name, 
    c.supplier AS supplier, c.name AS name, c.exch_rate AS exch_rate, c.year AS year, 
    c.per AS per, c.cost_element AS cost_element, c.cost_element_descr AS cost_element_descr, 
    c.matl_group AS matl_group, c.material AS material, c.description AS description, 
    c.user_name AS user_name, c.docc AS docc, c.quantity AS quantity, c.qty_plan AS qty_plan, 
    c.debit_date AS debit_date, c.doc_date AS doc_date, c.cocode AS cocode, 
    c.report_currency AS report_currency, c.val_in_rep_cur AS val_in_rep_cur, 
    c.tcurr AS tcurr, c.value_tcur AS value_tcur, c.obj_curr AS obj_curr, 
    c.value_in_obj_crcy AS value_in_obj_crcy, 
    TRIM(c.wbs_element) AS single_wbs, 
    CAST(c.val_in_rep_cur AS NUMERIC(15,2)) / 1000 AS open_commitment_KEUR, 
    TRIM(w.merged_wbs) AS merged_wbs, TRIM(w.loa_id) AS loa_id, 
    TRIM(w.wbs_type) AS wbs_type, TRIM(w.wbs_description) AS wbs_description, 
    TRIM(REPLACE(TRIM(cm.categories), '  ', ' ')) AS categories, 
    TRIM(
        CASE 
            WHEN TRIM(w.merged_wbs) <> '' AND TRIM(cm.categories) <> '' 
            THEN CONCAT(TRIM(w.merged_wbs), '-', TRIM(REPLACE(TRIM(cm.categories), '  ', ' '))) 
            WHEN TRIM(w.merged_wbs) <> '' THEN TRIM(w.merged_wbs) 
            WHEN TRIM(cm.categories) <> '' THEN TRIM(REPLACE(TRIM(cm.categories), '  ', ' ')) 
            ELSE NULL 
        END
    ) AS "Merged_wbs_categories" 
FROM cji5_new c 
LEFT JOIN (
    SELECT 
        TRIM(single_wbs) AS single_wbs, MAX(merged_wbs) AS merged_wbs, 
        MAX(loa_id) AS loa_id, MAX(wbs_type) AS wbs_type, MAX(wbs_description) AS wbs_description 
    FROM wbs_loa_id_mapping1 
    GROUP BY TRIM(single_wbs)
) w ON TRIM(c.wbs_element) = w.single_wbs 
LEFT JOIN (
    SELECT TRIM(cost_element) AS cost_element, MAX(categories) AS categories 
    FROM cost_mapping 
    GROUP BY TRIM(cost_element)
) cm ON TRIM(c.cost_element) = cm.cost_element;

CREATE OR REPLACE VIEW final_dashboard AS 
WITH master_keys AS (
    SELECT "Merged_wbs_categories" FROM join_summary 
    UNION 
    SELECT "Merged_wbs_categories" FROM v_cj74_transformed 
    UNION 
    SELECT "Merged_wbs_categories" FROM v_cji5_transformed
)
SELECT 
    COALESCE(s.id::TEXT, CONCAT('NEW-', k."Merged_wbs_categories")) AS id,
    COALESCE(s.bu, cj.bu) AS bu,
    COALESCE(s.customer, cj.customer) AS customer,
    COALESCE(s.loa_id, cj.loa_id, ci.loa_id, SPLIT_PART(k."Merged_wbs_categories", '-', 1)) AS loa_id,
    COALESCE(s.loa_name, cj.loa_name) AS loa_name,
    COALESCE(s.cost_revenue, CASE WHEN k."Merged_wbs_categories" LIKE '%Revenue%' THEN 'Revenue' ELSE 'Cost' END) AS cost_revenue,
    COALESCE(s.categories, REVERSE(SPLIT_PART(REVERSE(k."Merged_wbs_categories"), '-', 1))) AS categories,
    COALESCE(s.merged_wbs, cj.merged_wbs, ci.merged_wbs) AS merged_wbs,
    COALESCE(s.active_inactive, 'Active') AS active_inactive,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(s.asbl, 0.00) ELSE 0.00 END AS asbl,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(s.asbl_amc, 0.00) ELSE 0.00 END AS asbl_amc,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(s.asbl_project, 0.00) ELSE 0.00 END AS asbl_project,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(s.asbl_warranty, 0.00) ELSE 0.00 END AS asbl_warranty,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(s.asbl_loa, 0.00) ELSE 0.00 END AS asbl_loa,
    COALESCE(s.non_committed, 0.00) AS non_committed,
    COALESCE(s.non_committed_amc, 0.00) AS non_committed_amc,
    COALESCE(s.non_committed_project, 0.00) AS non_committed_project,
    COALESCE(s.non_committed_warranty, 0.00) AS non_committed_warranty,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(s.non_committed_editable, 0.00) ELSE 0.00 END AS non_committed_editable,
    COALESCE(s.non_committed_editable_amc, 0.00) AS non_committed_editable_amc,
    COALESCE(s.non_committed_editable_project, 0.00) AS non_committed_editable_project,
    COALESCE(s.non_committed_editable_warranty, 0.00) AS non_committed_editable_warranty,
    COALESCE(cj.period, 'No Actuals') AS period,
    COALESCE(cj.ptd, 0.00) AS ptd,
    COALESCE(cj.single_wbs, ci.single_wbs) AS wbs_element_single,
    COALESCE(cj.wbs_type, ci.wbs_type) AS wbs_type,
    COALESCE(cj.wbs_description, ci.wbs_description) AS wbs_description,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(ci.total_oc, 0.00) ELSE 0.00 END AS open_commitment_KEUR,
    COALESCE(cj.ptd, 0.00) + CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(ci.total_oc, 0.00) ELSE 0.00 END + CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(s.non_committed_editable, 0.00) ELSE 0.00 END AS eac,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(s.asbl, 0.00) ELSE 0.00 END - (COALESCE(cj.ptd, 0.00) + CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(ci.total_oc, 0.00) ELSE 0.00 END + CASE WHEN ROW_NUMBER() OVER (PARTITION BY k."Merged_wbs_categories" ORDER BY COALESCE(cj.period, '0000-P000') DESC) = 1 THEN COALESCE(s.non_committed_editable, 0.00) ELSE 0.00 END) AS eac_vs_asbl,
    k."Merged_wbs_categories" AS "Merged_wbs_categories",
    s.updated_by AS updated_by,
    s.updated_at AS updated_at 
FROM master_keys k 
LEFT JOIN join_summary s ON k."Merged_wbs_categories" = s."Merged_wbs_categories"
LEFT JOIN (
    SELECT 
        "Merged_wbs_categories", period, single_wbs, wbs_type, wbs_description, 
        bu, customer, loa_id, loa_name, merged_wbs, SUM(ptd_val) AS ptd 
    FROM v_cj74_transformed 
    GROUP BY "Merged_wbs_categories", period, single_wbs, wbs_type, wbs_description, bu, customer, loa_id, loa_name, merged_wbs
) cj ON k."Merged_wbs_categories" = cj."Merged_wbs_categories"
LEFT JOIN (
    SELECT 
        "Merged_wbs_categories", single_wbs, wbs_type, wbs_description, loa_id, merged_wbs, SUM(open_commitment_KEUR) AS total_oc 
    FROM v_cji5_transformed 
    GROUP BY "Merged_wbs_categories", single_wbs, wbs_type, wbs_description, loa_id, merged_wbs
) ci ON k."Merged_wbs_categories" = ci."Merged_wbs_categories";
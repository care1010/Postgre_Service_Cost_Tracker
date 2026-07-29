CREATE TABLE `access` (
  `id` int(11) NOT NULL,
  `customer` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `cj74_new` (
  `id` int(11) NOT NULL,
  `year` int(11) DEFAULT NULL,
  `per` varchar(255) DEFAULT NULL,
  `cocd` varchar(255) DEFAULT NULL,
  `proj_def` varchar(255) DEFAULT NULL,
  `object_1` varchar(255) DEFAULT NULL,
  `profit_ctr` varchar(255) DEFAULT NULL,
  `name2` varchar(255) DEFAULT NULL,
  `tcurr` text DEFAULT NULL,
  `value_trancurr` decimal(18,2) DEFAULT NULL,
  `obcur` varchar(255) DEFAULT NULL,
  `val_in_obj_crcy` decimal(18,2) DEFAULT NULL,
  `val_in_rc` decimal(18,2) DEFAULT NULL,
  `rcurr` varchar(255) DEFAULT NULL,
  `cost_element` varchar(255) DEFAULT NULL,
  `cost_element_name` varchar(255) DEFAULT NULL,
  `cost_element_descr` varchar(255) DEFAULT NULL,
  `refdocno` varchar(255) DEFAULT NULL,
  `document_no` varchar(255) DEFAULT NULL,
  `doc_date` date DEFAULT NULL,
  `postg_date` date DEFAULT NULL,
  `offst_acct` varchar(255) DEFAULT NULL,
  `name_of_offsetting_account` varchar(255) DEFAULT NULL,
  `object_2` varchar(255) DEFAULT NULL,
  `material` varchar(255) DEFAULT NULL,
  `material_description` varchar(255) DEFAULT NULL,
  `name1` varchar(255) DEFAULT NULL,
  `name22` varchar(255) DEFAULT NULL,
  `created_on` date DEFAULT NULL,
  `frm` varchar(255) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `object_3` varchar(255) DEFAULT NULL,
  `co_object_name` varchar(255) DEFAULT NULL,
  `pur_doc` varchar(255) DEFAULT NULL,
  `quantity` decimal(18,3) DEFAULT NULL,
  `purchase_order_text` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `cji5_new` (
  `id` int(11) NOT NULL,
  `project_def` varchar(255) DEFAULT NULL,
  `wbs_element` varchar(255) DEFAULT NULL,
  `refdocno` varchar(255) DEFAULT NULL,
  `item` varchar(255) DEFAULT NULL,
  `co_object_name` varchar(255) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `exch_rate` decimal(18,6) DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `per` varchar(255) DEFAULT NULL,
  `cost_element` varchar(255) DEFAULT NULL,
  `cost_element_descr` varchar(255) DEFAULT NULL,
  `matl_group` varchar(255) DEFAULT NULL,
  `material` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `docc` varchar(255) DEFAULT NULL,
  `quantity` decimal(18,3) DEFAULT NULL,
  `qty_plan` decimal(18,3) DEFAULT NULL,
  `debit_date` date DEFAULT NULL,
  `doc_date` date DEFAULT NULL,
  `cocode` varchar(255) DEFAULT NULL,
  `report_currency` varchar(255) DEFAULT NULL,
  `val_in_rep_cur` decimal(18,2) DEFAULT NULL,
  `tcurr` text DEFAULT NULL,
  `value_tcur` decimal(18,2) DEFAULT NULL,
  `obj_curr` varchar(255) DEFAULT NULL,
  `value_in_obj_crcy` decimal(18,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `cost_mapping` (
  `id` int(11) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `cost_element_group_name` varchar(255) DEFAULT NULL,
  `cost_element` varchar(100) DEFAULT NULL,
  `cost_element_name` varchar(255) DEFAULT NULL,
  `cost_element_desc` text DEFAULT NULL,
  `cost_revenue` varchar(50) DEFAULT NULL,
  `categories` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `customer` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `erp_resource` (
  `id` int(11) NOT NULL,
  `tr_global_period` varchar(50) DEFAULT NULL,
  `lm_nokia_id_name` varchar(255) DEFAULT NULL,
  `home_country` varchar(100) DEFAULT NULL,
  `resource_erp_type` varchar(100) DEFAULT NULL,
  `resource_person_number` varchar(50) DEFAULT NULL,
  `resource_nokia_id_name` varchar(255) DEFAULT NULL,
  `time_entry_date` date DEFAULT NULL,
  `recorded_hours` decimal(5,2) DEFAULT NULL,
  `time_entry_status` varchar(50) DEFAULT NULL,
  `daily_working_hours` decimal(5,2) DEFAULT NULL,
  `tr_wbs_care_contract_opp` varchar(255) DEFAULT NULL,
  `tr_wbs_care_contract_opp_description` text DEFAULT NULL,
  `svo_id` varchar(100) DEFAULT NULL,
  `svo_description` text DEFAULT NULL,
  `gic` varchar(100) DEFAULT NULL,
  `gic_name` varchar(255) DEFAULT NULL,
  `customer_team` varchar(255) DEFAULT NULL,
  `time_approval_date` date DEFAULT NULL,
  `lm_email` varchar(255) DEFAULT NULL,
  `resource_email` varchar(255) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `month` varchar(20) DEFAULT NULL,
  `upload_date` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `final_dashboard_table` (
  `id` text DEFAULT NULL,
  `bu` varchar(100) DEFAULT NULL,
  `customer` varchar(255) DEFAULT NULL,
  `loa_id` varchar(100) DEFAULT NULL,
  `loa_name` varchar(255) DEFAULT NULL,
  `cost_revenue` varchar(100) DEFAULT NULL,
  `categories` varchar(100) DEFAULT NULL,
  `merged_wbs` text DEFAULT NULL,
  `active_inactive` varchar(50) DEFAULT NULL,
  `asbl` decimal(15,2) DEFAULT NULL,
  `asbl_amc` decimal(15,2) DEFAULT NULL,
  `asbl_project` decimal(15,2) DEFAULT NULL,
  `asbl_warranty` decimal(15,2) DEFAULT NULL,
  `asbl_loa` decimal(15,2) DEFAULT NULL,
  `non_committed` decimal(15,2) DEFAULT NULL,
  `non_committed_amc` decimal(15,2) DEFAULT NULL,
  `non_committed_project` decimal(15,2) DEFAULT NULL,
  `non_committed_warranty` decimal(15,2) DEFAULT NULL,
  `non_committed_editable` decimal(15,2) DEFAULT NULL,
  `non_committed_editable_amc` decimal(15,2) DEFAULT NULL,
  `non_committed_editable_project` decimal(15,2) DEFAULT NULL,
  `non_committed_editable_warranty` decimal(15,2) DEFAULT NULL,
  `period` varchar(20) DEFAULT NULL,
  `ptd` decimal(15,2) DEFAULT NULL,
  `wbs_element_single` varchar(255) DEFAULT NULL,
  `wbs_type` varchar(100) DEFAULT NULL,
  `wbs_description` text DEFAULT NULL,
  `open_commitment_KEUR` decimal(15,2) DEFAULT NULL,
  `eac` decimal(20,3) DEFAULT NULL,
  `eac_vs_asbl` decimal(20,3) DEFAULT NULL,
  `Merged_wbs_categories` text DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `master_categories` (
  `id` int(11) NOT NULL,
  `categories` varchar(255) NOT NULL,
  `cost_revenue_type` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `master_cost_element` (
  `id` int(11) NOT NULL,
  `cost_element` varchar(255) NOT NULL,
  `cost_mapping` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `stg_cj74_agg` (
  `clean_wbs` text DEFAULT NULL,
  `cost_element` varchar(255) DEFAULT NULL,
  `period` varchar(16) DEFAULT NULL,
  `ptd_val` decimal(44,6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `stg_cji5_agg` (
  `clean_wbs` text DEFAULT NULL,
  `cost_element` text DEFAULT NULL,
  `oc_val` decimal(44,6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `stg_master_mapping` (
  `single_wbs` text DEFAULT NULL,
  `bu` varchar(100) DEFAULT NULL,
  `customer` varchar(255) DEFAULT NULL,
  `loa_id` varchar(100) DEFAULT NULL,
  `loa_name` varchar(255) DEFAULT NULL,
  `merged_wbs` mediumtext DEFAULT NULL,
  `wbs_type` varchar(100) DEFAULT NULL,
  `wbs_description` mediumtext DEFAULT NULL,
  `categories` varchar(100) DEFAULT NULL,
  `cost_element` varchar(100) DEFAULT NULL,
  `mapped_cost_revenue` varchar(50) DEFAULT NULL,
  `Merged_wbs_categories` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `summary` (
  `id` int(11) NOT NULL,
  `bu` varchar(255) DEFAULT NULL,
  `customer` varchar(255) DEFAULT NULL,
  `loa_id` varchar(255) DEFAULT NULL,
  `loa_name` varchar(255) DEFAULT NULL,
  `cost_revenue` varchar(255) DEFAULT NULL,
  `categories` varchar(255) DEFAULT NULL,
  `merged_wbs` text DEFAULT NULL,
  `Merged_wbs_category` text DEFAULT NULL,
  `active_inactive` varchar(255) DEFAULT 'Active',
  `asbl` decimal(15,3) DEFAULT 0.000,
  `asbl_amc` decimal(15,3) DEFAULT 0.000,
  `asbl_project` decimal(15,3) DEFAULT 0.000,
  `asbl_warranty` decimal(15,3) DEFAULT 0.000,
  `asbl_loa` decimal(15,3) DEFAULT 0.000,
  `ptd` decimal(15,3) DEFAULT 0.000,
  `open_commitment_KEUR` decimal(15,3) DEFAULT 0.000,
  `non_committed` decimal(15,3) DEFAULT 0.000,
  `non_committed_amc` decimal(15,3) DEFAULT 0.000,
  `non_committed_project` decimal(15,3) DEFAULT 0.000,
  `non_committed_warranty` decimal(15,3) DEFAULT 0.000,
  `eac` decimal(15,3) DEFAULT 0.000,
  `eac_vs_asbl` decimal(15,3) DEFAULT 0.000,
  `non_committed_editable` decimal(15,3) DEFAULT 0.000,
  `non_committed_editable_amc` decimal(15,3) DEFAULT 0.000,
  `non_committed_editable_project` decimal(15,3) DEFAULT 0.000,
  `non_committed_editable_warranty` decimal(15,3) DEFAULT 0.000,
  `updated_by` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `temp` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `row_id` varchar(500) NOT NULL,
  `Non_Commited` decimal(10,2) DEFAULT NULL,
  `original_non_commited` decimal(10,2) DEFAULT NULL,
  `timestamp` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `t_cj74_transformed` (
  `id` int(11) NOT NULL,
  `sap_wbs` varchar(100) DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `per` int(11) DEFAULT NULL,
  `cost_element` varchar(255) DEFAULT NULL,
  `cost_element_name` varchar(255) DEFAULT NULL,
  `ptd_val` decimal(19,6) DEFAULT NULL,
  `period` varchar(20) DEFAULT NULL,
  `cocd` varchar(255) DEFAULT NULL,
  `proj_def` varchar(255) DEFAULT NULL,
  `profit_ctr` varchar(255) DEFAULT NULL,
  `name2` varchar(255) DEFAULT NULL,
  `tcurr` varchar(255) DEFAULT NULL,
  `value_trancurr` decimal(18,2) DEFAULT NULL,
  `obcur` varchar(255) DEFAULT NULL,
  `val_in_obj_crcy` decimal(18,2) DEFAULT NULL,
  `val_in_rc` decimal(18,2) DEFAULT NULL,
  `rcurr` varchar(10) DEFAULT NULL,
  `cost_element_descr` varchar(255) DEFAULT NULL,
  `refdocno` varchar(100) DEFAULT NULL,
  `document_no` varchar(100) DEFAULT NULL,
  `doc_date` date DEFAULT NULL,
  `postg_date` date DEFAULT NULL,
  `offst_acct` varchar(100) DEFAULT NULL,
  `name_of_offsetting_account` varchar(255) DEFAULT NULL,
  `material` varchar(100) DEFAULT NULL,
  `material_description` varchar(255) DEFAULT NULL,
  `name1` varchar(255) DEFAULT NULL,
  `name22` varchar(255) DEFAULT NULL,
  `created_on` date DEFAULT NULL,
  `origin_form` varchar(100) DEFAULT NULL,
  `user_name` varchar(100) DEFAULT NULL,
  `pur_doc` varchar(100) DEFAULT NULL,
  `quantity` decimal(18,3) DEFAULT NULL,
  `purchase_order_text` varchar(100) DEFAULT NULL,
  `loa_id` varchar(100) DEFAULT NULL,
  `wbs_string` text DEFAULT NULL,
  `wbs_type` varchar(100) DEFAULT NULL,
  `wbs_description` varchar(255) DEFAULT NULL,
  `categories` varchar(255) DEFAULT NULL,
  `cost_revenue` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `t_cji5_transformed` (
  `id` int(11) NOT NULL,
  `project_def` varchar(255) DEFAULT NULL,
  `sap_wbs` varchar(255) DEFAULT NULL,
  `refdocno` varchar(255) DEFAULT NULL,
  `item` varchar(255) DEFAULT NULL,
  `co_object_name` varchar(255) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `exch_rate` decimal(18,6) DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `per` varchar(255) DEFAULT NULL,
  `cost_element` varchar(255) DEFAULT NULL,
  `cost_element_descr` varchar(255) DEFAULT NULL,
  `matl_group` varchar(255) DEFAULT NULL,
  `material` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `docc` varchar(255) DEFAULT NULL,
  `quantity` decimal(18,3) DEFAULT NULL,
  `qty_plan` decimal(18,3) DEFAULT NULL,
  `debit_date` date DEFAULT NULL,
  `doc_date` date DEFAULT NULL,
  `cocode` varchar(255) DEFAULT NULL,
  `report_currency` varchar(255) DEFAULT NULL,
  `val_in_rep_cur` decimal(18,2) DEFAULT NULL,
  `tcurr` text DEFAULT NULL,
  `value_tcur` decimal(18,2) DEFAULT NULL,
  `obj_curr` varchar(255) DEFAULT NULL,
  `value_in_obj_crcy` decimal(18,2) DEFAULT NULL,
  `oc_val` decimal(19,6) DEFAULT NULL,
  `loa_id` varchar(255) DEFAULT NULL,
  `wbs_type` varchar(255) DEFAULT NULL,
  `categories` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `user_activity_logs` (
  `id` int(11) NOT NULL,
  `user_email` varchar(255) DEFAULT NULL,
  `bu` varchar(10) DEFAULT NULL,
  `customer` varchar(255) DEFAULT NULL,
  `loa_name` varchar(255) DEFAULT NULL,
  `loa_id` varchar(20) DEFAULT NULL,
  `categories` varchar(255) DEFAULT NULL,
  `old_value` decimal(18,2) DEFAULT NULL,
  `new_value` decimal(18,2) DEFAULT NULL,
  `month_year` varchar(20) DEFAULT NULL,
  `wbs_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `active_inactive` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `wbs_loa_id_mapping1` (
  `id` int(11) NOT NULL,
  `bu` varchar(100) DEFAULT NULL,
  `customer` varchar(255) DEFAULT NULL,
  `loa_id` varchar(100) DEFAULT NULL,
  `loa_name` varchar(255) DEFAULT NULL,
  `wbs_type` varchar(100) DEFAULT NULL,
  `single_wbs` varchar(255) DEFAULT NULL,
  `wbs_description` mediumtext DEFAULT NULL,
  `merged_wbs` mediumtext DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Indexes for dumped tables
ALTER TABLE `access`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `cj74_new`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_object_1` (`object_1`(100)),
  ADD KEY `idx_cost_element` (`cost_element`(50));

ALTER TABLE `cji5_new`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `cost_mapping`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cost_element` (`cost_element`(50));

ALTER TABLE `customer`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `erp_resource`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tr_global_period` (`tr_global_period`),
  ADD KEY `idx_lm_nokia_id_name` (`lm_nokia_id_name`),
  ADD KEY `idx_home_country` (`home_country`),
  ADD KEY `idx_resource_erp_type` (`resource_erp_type`),
  ADD KEY `idx_resource_person_number` (`resource_person_number`),
  ADD KEY `idx_resource_nokia_id_name` (`resource_nokia_id_name`),
  ADD KEY `idx_time_entry_status` (`time_entry_status`),
  ADD KEY `idx_tr_wbs_care_contract_opp` (`tr_wbs_care_contract_opp`),
  ADD KEY `idx_svo_id` (`svo_id`),
  ADD KEY `idx_gic` (`gic`),
  ADD KEY `idx_gic_name` (`gic_name`),
  ADD KEY `idx_customer_team` (`customer_team`),
  ADD KEY `idx_lm_email` (`lm_email`),
  ADD KEY `idx_resource_email` (`resource_email`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_month` (`month`);

ALTER TABLE `final_dashboard_table`
  ADD KEY `bu` (`bu`),
  ADD KEY `loa_id` (`loa_id`),
  ADD KEY `unique_key` (`Merged_wbs_categories`(768)),
  ADD KEY `idx_perf_loa` (`loa_id`),
  ADD KEY `idx_perf_cat` (`categories`),
  ADD KEY `idx_perf_wbs_type` (`wbs_type`),
  ADD KEY `idx_perf_bu_cust` (`bu`,`customer`);

ALTER TABLE `master_categories`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `master_cost_element`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cost_element` (`cost_element`),
  ADD KEY `idx_cost_mapping` (`cost_mapping`);

ALTER TABLE `stg_cj74_agg`
  ADD KEY `clean_wbs` (`clean_wbs`(768)),
  ADD KEY `cost_element` (`cost_element`);

ALTER TABLE `stg_cji5_agg`
  ADD KEY `clean_wbs` (`clean_wbs`(768)),
  ADD KEY `cost_element` (`cost_element`(768));

ALTER TABLE `stg_master_mapping`
  ADD KEY `single_wbs` (`single_wbs`(768)),
  ADD KEY `cost_element` (`cost_element`),
  ADD KEY `Merged_wbs_categories` (`Merged_wbs_categories`(255));

ALTER TABLE `summary`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sum_loa_cat` (`loa_id`,`categories`),
  ADD KEY `idx_sum_merged` (`Merged_wbs_category`(768));

ALTER TABLE `temp`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `user_activity_logs`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `wbs_loa_id_mapping1`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bu` (`bu`),
  ADD KEY `idx_customer` (`customer`),
  ADD KEY `idx_loa_id` (`loa_id`),
  ADD KEY `idx_loa_name` (`loa_name`),
  ADD KEY `idx_wbs_type` (`wbs_type`),
  ADD KEY `idx_wbs_element` (`single_wbs`),
  ADD KEY `idx_wbs` (`merged_wbs`(768));

ALTER TABLE `access`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=244;

ALTER TABLE `cj74_new`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=636699;

ALTER TABLE `cji5_new`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14962;

ALTER TABLE `cost_mapping`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=159;

ALTER TABLE `customer`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

ALTER TABLE `erp_resource`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19847;

ALTER TABLE `master_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

ALTER TABLE `master_cost_element`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

ALTER TABLE `summary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8530;

ALTER TABLE `temp`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=116;

ALTER TABLE `user_activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `wbs_loa_id_mapping1`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=593;

-- VIEWS
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `final_dashboard`  AS WITH master_keys AS (SELECT `join_summary`.`Merged_wbs_categories` AS `Merged_wbs_categories` FROM `join_summary` UNION SELECT `v_cj74_transformed`.`Merged_wbs_categories` AS `Merged_wbs_categories` FROM `v_cj74_transformed` UNION SELECT `v_cji5_transformed`.`Merged_wbs_categories` AS `Merged_wbs_categories` FROM `v_cji5_transformed`)  )select coalesce(`s`.`id`,concat('NEW-',`k`.`Merged_wbs_categories`)) AS `id`,coalesce(`s`.`bu`,`cj`.`bu`) AS `bu`,coalesce(`s`.`customer`,`cj`.`customer`) AS `customer`,coalesce(`s`.`loa_id`,`cj`.`loa_id`,`ci`.`loa_id`,substring_index(`k`.`Merged_wbs_categories`,'-',1)) AS `loa_id`,coalesce(`s`.`loa_name`,`cj`.`loa_name`) AS `loa_name`,coalesce(`s`.`cost_revenue`,case when `k`.`Merged_wbs_categories` like '%Revenue%' then 'Revenue' else 'Cost' end) AS `cost_revenue`,coalesce(`s`.`categories`,substring_index(`k`.`Merged_wbs_categories`,'-',-1)) AS `categories`,coalesce(`s`.`merged_wbs`,`cj`.`merged_wbs`,`ci`.`merged_wbs`) AS `merged_wbs`,coalesce(`s`.`active_inactive`,'Active') AS `active_inactive`,case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`s`.`asbl`,0) else 0 end AS `asbl`,case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`s`.`asbl_amc`,0) else 0 end AS `asbl_amc`,case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`s`.`asbl_project`,0) else 0 end AS `asbl_project`,case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`s`.`asbl_warranty`,0) else 0 end AS `asbl_warranty`,case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`s`.`asbl_loa`,0) else 0 end AS `asbl_loa`,ifnull(`s`.`non_committed`,0) AS `non_committed`,ifnull(`s`.`non_committed_amc`,0) AS `non_committed_amc`,ifnull(`s`.`non_committed_project`,0) AS `non_committed_project`,ifnull(`s`.`non_committed_warranty`,0) AS `non_committed_warranty`,case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`s`.`non_committed_editable`,0) else 0 end AS `non_committed_editable`,ifnull(`s`.`non_committed_editable_amc`,0) AS `non_committed_editable_amc`,ifnull(`s`.`non_committed_editable_project`,0) AS `non_committed_editable_project`,ifnull(`s`.`non_committed_editable_warranty`,0) AS `non_committed_editable_warranty`,coalesce(`cj`.`period`,'No Actuals') AS `period`,ifnull(`cj`.`ptd`,0) AS `ptd`,coalesce(`cj`.`single_wbs`,`ci`.`single_wbs`) AS `wbs_element_single`,coalesce(`cj`.`wbs_type`,`ci`.`wbs_type`) AS `wbs_type`,coalesce(`cj`.`wbs_description`,`ci`.`wbs_description`) AS `wbs_description`,case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`ci`.`total_oc`,0) else 0 end AS `open_commitment_KEUR`,ifnull(`cj`.`ptd`,0) + case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`ci`.`total_oc`,0) else 0 end + case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`s`.`non_committed_editable`,0) else 0 end AS `eac`,case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`s`.`asbl`,0) else 0 end - (ifnull(`cj`.`ptd`,0) + case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`ci`.`total_oc`,0) else 0 end + case when row_number() over ( partition by `k`.`Merged_wbs_categories` order by coalesce(`cj`.`period`,'0000-P000') desc) = 1 then ifnull(`s`.`non_committed_editable`,0) else 0 end) AS `eac_vs_asbl`,`k`.`Merged_wbs_categories` AS `Merged_wbs_categories`,`s`.`updated_by` AS `updated_by`,`s`.`updated_at` AS `updated_at` from (((`master_keys` `k` left join `join_summary` `s` on(`k`.`Merged_wbs_categories` = `s`.`Merged_wbs_categories`)) left join (select `v_cj74_transformed`.`Merged_wbs_categories` AS `Merged_wbs_categories`,`v_cj74_transformed`.`period` AS `period`,`v_cj74_transformed`.`single_wbs` AS `single_wbs`,`v_cj74_transformed`.`wbs_type` AS `wbs_type`,`v_cj74_transformed`.`wbs_description` AS `wbs_description`,`v_cj74_transformed`.`bu` AS `bu`,`v_cj74_transformed`.`customer` AS `customer`,`v_cj74_transformed`.`loa_id` AS `loa_id`,`v_cj74_transformed`.`loa_name` AS `loa_name`,`v_cj74_transformed`.`merged_wbs` AS `merged_wbs`,sum(`v_cj74_transformed`.`ptd_val`) AS `ptd` from `v_cj74_transformed` group by `v_cj74_transformed`.`Merged_wbs_categories`,`v_cj74_transformed`.`period`,`v_cj74_transformed`.`single_wbs`,`v_cj74_transformed`.`wbs_type`,`v_cj74_transformed`.`wbs_description`,`v_cj74_transformed`.`bu`,`v_cj74_transformed`.`customer`,`v_cj74_transformed`.`loa_id`,`v_cj74_transformed`.`loa_name`,`v_cj74_transformed`.`merged_wbs`) `cj` on(`k`.`Merged_wbs_categories` = `cj`.`Merged_wbs_categories`)) left join (select `v_cji5_transformed`.`Merged_wbs_categories` AS `Merged_wbs_categories`,`v_cji5_transformed`.`single_wbs` AS `single_wbs`,`v_cji5_transformed`.`wbs_type` AS `wbs_type`,`v_cji5_transformed`.`wbs_description` AS `wbs_description`,`v_cji5_transformed`.`loa_id` AS `loa_id`,`v_cji5_transformed`.`merged_wbs` AS `merged_wbs`,sum(`v_cji5_transformed`.`open_commitment_KEUR`) AS `total_oc` from `v_cji5_transformed` group by `v_cji5_transformed`.`Merged_wbs_categories`,`v_cji5_transformed`.`single_wbs`,`v_cji5_transformed`.`wbs_type`,`v_cji5_transformed`.`wbs_description`,`v_cji5_transformed`.`loa_id`,`v_cji5_transformed`.`merged_wbs`) `ci` on(`k`.`Merged_wbs_categories` = `ci`.`Merged_wbs_categories`))  ;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY INVOKER VIEW `join_summary`  AS SELECT trim(`s`.`id`) AS `id`, trim(`s`.`bu`) AS `bu`, trim(`s`.`customer`) AS `customer`, trim(`s`.`loa_id`) AS `loa_id`, trim(`s`.`loa_name`) AS `loa_name`, trim(`s`.`cost_revenue`) AS `cost_revenue`, trim(replace(trim(`s`.`categories`),'  ',' ')) AS `categories`, trim(`s`.`merged_wbs`) AS `merged_wbs`, trim(`s`.`active_inactive`) AS `active_inactive`, trim(`s`.`asbl`) AS `asbl`, trim(`s`.`asbl_amc`) AS `asbl_amc`, trim(`s`.`asbl_project`) AS `asbl_project`, trim(`s`.`asbl_warranty`) AS `asbl_warranty`, trim(`s`.`asbl_loa`) AS `asbl_loa`, trim(`s`.`non_committed`) AS `non_committed`, trim(`s`.`non_committed_amc`) AS `non_committed_amc`, trim(`s`.`non_committed_project`) AS `non_committed_project`, trim(`s`.`non_committed_warranty`) AS `non_committed_warranty`, trim(`s`.`non_committed_editable`) AS `non_committed_editable`, trim(`s`.`non_committed_editable_amc`) AS `non_committed_editable_amc`, trim(`s`.`non_committed_editable_project`) AS `non_committed_editable_project`, trim(`s`.`non_committed_editable_warranty`) AS `non_committed_editable_warranty`, trim(`s`.`ptd`) AS `ptd_old`, trim(`s`.`open_commitment_KEUR`) AS `oc_old`, trim(`s`.`updated_by`) AS `updated_by`, trim(`s`.`updated_at`) AS `updated_at`, convert(coalesce(nullif(trim(`s`.`Merged_wbs_category`),''),case when trim(`s`.`merged_wbs`) <> '' and trim(`s`.`categories`) <> '' then concat(trim(`s`.`merged_wbs`),'-',trim(replace(trim(`s`.`categories`),'  ',' '))) else NULL end) using utf8mb4) FROM `summary` AS `s` ;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_cj74_transformed`  AS SELECT `c`.`id` AS `id`, `c`.`year` AS `year`, `c`.`per` AS `per`, `c`.`cocd` AS `cocd`, `c`.`proj_def` AS `proj_def`, `c`.`object_1` AS `object_1`, `c`.`profit_ctr` AS `profit_ctr`, `c`.`name2` AS `name2`, `c`.`tcurr` AS `tcurr`, `c`.`value_trancurr` AS `value_trancurr`, `c`.`obcur` AS `obcur`, `c`.`val_in_obj_crcy` AS `val_in_obj_crcy`, `c`.`val_in_rc` AS `val_in_rc`, `c`.`rcurr` AS `rcurr`, `c`.`cost_element` AS `cost_element`, `c`.`cost_element_name` AS `cost_element_name`, `c`.`cost_element_descr` AS `cost_element_descr`, `c`.`refdocno` AS `refdocno`, `c`.`document_no` AS `document_no`, `c`.`doc_date` AS `doc_date`, `c`.`postg_date` AS `postg_date`, `c`.`offst_acct` AS `offst_acct`, `c`.`name_of_offsetting_account` AS `name_of_offsetting_account`, `c`.`object_2` AS `object_2`, `c`.`material` AS `material`, `c`.`material_description` AS `material_description`, `c`.`name1` AS `name1`, `c`.`name22` AS `name22`, `c`.`created_on` AS `created_on`, `c`.`frm` AS `frm`, `c`.`user_name` AS `user_name`, `c`.`object_3` AS `object_3`, `c`.`co_object_name` AS `co_object_name`, `c`.`pur_doc` AS `pur_doc`, `c`.`quantity` AS `quantity`, `c`.`purchase_order_text` AS `purchase_order_text`, trim(replace(replace(replace(`c`.`object_1`,' ',''),'\n',''),'\r','')) AS `single_wbs`, cast(`c`.`val_in_rc` as decimal(15,2)) / 1000 AS `ptd_val`, trim(concat(`c`.`year`,'-P',lpad(cast(`c`.`per` as unsigned),3,'0'))) AS `period`, trim(`w`.`loa_id`) AS `loa_id`, trim(`w`.`merged_wbs`) AS `merged_wbs`, trim(`w`.`wbs_type`) AS `wbs_type`, trim(`w`.`wbs_description`) AS `wbs_description`, trim(replace(`cm`.`categories`,'  ',' ')) AS `categories`, trim(coalesce(`w`.`bu`,`s`.`bu`)) AS `bu`, trim(coalesce(`w`.`customer`,`s`.`customer`)) AS `customer`, trim(coalesce(`w`.`loa_name`,`s`.`loa_name`)) AS `loa_name`, convert(trim(concat(ifnull(trim(`w`.`merged_wbs`),''),'-',ifnull(trim(replace(`cm`.`categories`,'  ',' ')),''))) using utf8mb4) FROM (((`cj74_new` `c` left join (select ucase(trim(replace(replace(replace(`wbs_loa_id_mapping1`.`single_wbs`,' ',''),'\n',''),'\r',''))) AS `clean_single_wbs`,max(`wbs_loa_id_mapping1`.`bu`) AS `bu`,max(`wbs_loa_id_mapping1`.`customer`) AS `customer`,max(`wbs_loa_id_mapping1`.`loa_id`) AS `loa_id`,max(`wbs_loa_id_mapping1`.`loa_name`) AS `loa_name`,max(`wbs_loa_id_mapping1`.`merged_wbs`) AS `merged_wbs`,max(`wbs_loa_id_mapping1`.`wbs_type`) AS `wbs_type`,max(`wbs_loa_id_mapping1`.`wbs_description`) AS `wbs_description` from `wbs_loa_id_mapping1` group by ucase(trim(replace(replace(replace(`wbs_loa_id_mapping1`.`single_wbs`,' ',''),'\n',''),'\r','')))) `w` on(ucase(trim(replace(replace(replace(`c`.`object_1`,' ',''),'\n',''),'\r',''))) = `w`.`clean_single_wbs`)) left join (select `cost_mapping`.`cost_element` AS `cost_element`,max(`cost_mapping`.`categories`) AS `categories` from `cost_mapping` group by `cost_mapping`.`cost_element`) `cm` on(trim(`c`.`cost_element`) = trim(`cm`.`cost_element`))) left join `summary` `s` on(trim(`w`.`merged_wbs`) = trim(`s`.`merged_wbs`))) ;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_cji5_transformed`  AS SELECT `c`.`id` AS `id`, `c`.`project_def` AS `project_def`, `c`.`wbs_element` AS `wbs_element`, `c`.`refdocno` AS `refdocno`, `c`.`item` AS `item`, `c`.`co_object_name` AS `co_object_name`, `c`.`supplier` AS `supplier`, `c`.`name` AS `name`, `c`.`exch_rate` AS `exch_rate`, `c`.`year` AS `year`, `c`.`per` AS `per`, `c`.`cost_element` AS `cost_element`, `c`.`cost_element_descr` AS `cost_element_descr`, `c`.`matl_group` AS `matl_group`, `c`.`material` AS `material`, `c`.`description` AS `description`, `c`.`user_name` AS `user_name`, `c`.`docc` AS `docc`, `c`.`quantity` AS `quantity`, `c`.`qty_plan` AS `qty_plan`, `c`.`debit_date` AS `debit_date`, `c`.`doc_date` AS `doc_date`, `c`.`cocode` AS `cocode`, `c`.`report_currency` AS `report_currency`, `c`.`val_in_rep_cur` AS `val_in_rep_cur`, `c`.`tcurr` AS `tcurr`, `c`.`value_tcur` AS `value_tcur`, `c`.`obj_curr` AS `obj_curr`, `c`.`value_in_obj_crcy` AS `value_in_obj_crcy`, trim(`c`.`wbs_element`) AS `single_wbs`, cast(`c`.`val_in_rep_cur` as decimal(15,2)) / 1000 AS `open_commitment_KEUR`, trim(`w`.`merged_wbs`) AS `merged_wbs`, trim(`w`.`loa_id`) AS `loa_id`, trim(`w`.`wbs_type`) AS `wbs_type`, trim(`w`.`wbs_description`) AS `wbs_description`, trim(replace(trim(`cm`.`categories`),'  ',' ')) AS `categories`, convert(trim(case when trim(`w`.`merged_wbs`) <> '' and trim(`cm`.`categories`) <> '' then concat(trim(`w`.`merged_wbs`),'-',trim(replace(trim(`cm`.`categories`),'  ',' '))) when trim(`w`.`merged_wbs`) <> '' then trim(`w`.`merged_wbs`) when trim(`cm`.`categories`) <> '' then trim(replace(trim(`cm`.`categories`),'  ',' ')) else NULL end) using utf8mb4) FROM ((`cji5_new` `c` left join (select trim(`wbs_loa_id_mapping1`.`single_wbs`) AS `single_wbs`,max(`wbs_loa_id_mapping1`.`merged_wbs`) AS `merged_wbs`,max(`wbs_loa_id_mapping1`.`loa_id`) AS `loa_id`,max(`wbs_loa_id_mapping1`.`wbs_type`) AS `wbs_type`,max(`wbs_loa_id_mapping1`.`wbs_description`) AS `wbs_description` from `wbs_loa_id_mapping1` group by trim(`wbs_loa_id_mapping1`.`single_wbs`)) `w` on(trim(`c`.`wbs_element`) = `w`.`single_wbs`)) left join (select trim(`cost_mapping`.`cost_element`) AS `cost_element`,max(`cost_mapping`.`categories`) AS `categories` from `cost_mapping` group by trim(`cost_mapping`.`cost_element`)) `cm` on(trim(`c`.`cost_element`) = `cm`.`cost_element`)) ;

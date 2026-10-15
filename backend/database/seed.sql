-- Run this file after selecting the same database where schema.sql was imported.
-- Optional sample data. Run only after creating a real admin user.
INSERT INTO projects (name,client,industry,description,start_date,end_date,status,created_by) VALUES
('Customer Satisfaction Study','Northstar Retail','Retail','Measure customer satisfaction across key store touchpoints.','2026-09-01','2026-11-15','active',NULL),
('Consumer Behaviour Mapping','Internal research','Consumer insights','Understand product discovery and purchase drivers.','2026-08-15','2026-10-30','planning',NULL),
('Digital Service Experience','Meridian Services','Professional services','Review user experience across digital service channels.','2026-06-01','2026-08-20','completed',NULL);
INSERT INTO responses (project_id,respondent_code,response_date,channel,answers,notes) VALUES
(1,'RESP-1001','2026-10-10','Online survey',JSON_OBJECT('satisfaction',5,'recommendation','Likely','age_group','25-34'),'Sample data only'),
(1,'RESP-1002','2026-10-11','Field survey',JSON_OBJECT('satisfaction',4,'recommendation','Maybe','age_group','35-44'),'Sample data only'),
(2,'RESP-2001','2026-10-12','Telephone',JSON_OBJECT('purchase_frequency','Monthly','brand_recall',3),'Sample data only');

-- =============================================================================
-- Platform owner user
-- Seeds the single "Platform Owner" account used to access the platform-level
-- admin surfaces. Every user belongs to a business, so the Platform Owner is
-- attached to the demo business created below.
-- =============================================================================
WITH seed_id AS (
  SELECT '019f3a2c-8b1e-7d4f-9a3b-c5e7f2814d60'::uuid AS id
)
INSERT INTO users (
  id,
  business_id,
  username,
  password,
  first_name,
  last_name,
  email,
  phone,
  role,
  status,
  avatar_url,
  email_verified,
  booking_url,
  notification_mode,
  notification_sound_enabled,
  notification_sound_type,
  reminder_enabled,
  reminder_mins_before,
  reminder_sound_type,
  user_working_hours,
  last_login_at,
  suspended_reason,
  created_at,
  created_by,
  updated_at,
  updated_by,
  deleted_at,
  deleted_by,
  is_deleted
)
SELECT
  seed_id.id,
  '019f3a2d-4c7f-7b8e-a2d5-e9f1c3057b84',
  'afaqjaved',
  '$2b$12$oKeoI5cSWasiDKsGarVXAeaSKFMA2N7Kc8mqgsV2h8G9zWEmSyeg2', -- admin12345
  'Afaq',
  'Javed',
  'owner@pikslots.com',
  NULL,
  'Platform Owner',
  'active',
  NULL,
  TRUE,
  'platform-owner',
  'all',
  TRUE,
  'chime',
  TRUE,
  10,
  'chime',
  '{"monday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"tuesday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"wednesday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"thursday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"friday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"saturday":{"enabled":false,"openTime":"09:00","closeTime":"17:00"},"sunday":{"enabled":false,"openTime":"09:00","closeTime":"17:00"}}'::jsonb,
  NULL,
  NULL,
  NOW(),
  seed_id.id,
  NOW(),
  seed_id.id,
  NULL,
  NULL,
  FALSE
FROM seed_id;

-- =============================================================================
-- Demo business
-- Seeds a single business for local development, owned by the platform owner
-- user created above (owner_id references the "afaqjaved" user). All
-- business-scoped seed users below (business owner, admin, standard,
-- enhanced) are attached to this business via business_id.
-- =============================================================================
INSERT INTO businesses (
  id,
  owner_id,
  slug,
  name,
  industry,
  about,
  appear_in_search_results,
  status,
  suspended_reason,
  brand_detail,
  brand_appearance_details,
  location_details,
  booking_policies,
  booking_setup,
  booking_contact_fields,
  booking_customization,
  booking_label_overrides,
  business_hours,
  business_links,
  contact_details,
  team_notifications,
  customer_notifications,
  notification_customization,
  subscription_plan,
  subscription_status,
  trial_ends_at,
  created_at,
  created_by,
  updated_at,
  updated_by,
  deleted_at,
  deleted_by,
  is_deleted
)
SELECT
  '019f3a2d-4c7f-7b8e-a2d5-e9f1c3057b84',
  u.id,
  'afaqs-demo-business',
  'Afaq''s Demo Business',
  'salon_and_beauty',
  'A demo business seeded for local development.',
  FALSE,
  'active',
  NULL,
  '{"bannerImageUrl":"","brandLogoUrl":""}'::jsonb,
  '{"brandColor":"#111111","brandButtonShape":"rounded","theme":"system","gallaryPhotosUrls":[]}'::jsonb,
  '{"address":"","city":"","state":"","zip":"","country":"","currency":"USD","timeZone":"UTC","language":"en"}'::jsonb,
  '{"leadTime":{"unit":"days","value":0},"scheduleWindow":{"unit":"days","value":10},"cancellationPolicy":null,"bookingPolicyText":"","showPolicyOnBookingPage":false}'::jsonb,
  '{"bookAppointmentSectionVisible":true,"bookClassSectionVisible":true,"aboutUsSectionVisible":true,"ourTeamSectionVisible":true,"servicesSectionVisible":true,"classesSectionVisible":true,"showFirstAvailable":false,"skipTeamSelection":false,"allowToBookMultipleServices":false,"bypassTeamMemberSelection":false,"customerLoginEnabled":false,"customerLoginRequired":false,"hidePikslotsBranding":false,"accordionView":true,"allowRescheduling":false,"allowCancellations":false,"showBookNewButton":false}'::jsonb,
  '{"name":{"enabled":true,"required":true},"email":{"enabled":true,"required":false},"phone":{"enabled":true,"required":true},"address":{"enabled":false,"required":false},"customFields":[]}'::jsonb,
  '{"language":"en","timeFormat":"12 hours","weekStartsOn":"monday","showBookAnotherAppointmentButton":true,"showServiceAndClassPrices":true,"showServiceAndClassDuration":true,"showBusinessHours":true,"showLocalTime":true}'::jsonb,
  '{"service":"Service","class":"Class","teamMember":"Team member","city":"City","state":"State","postalCode":"Postal code","termsAndConditions":{"label":"","link":"","requireTermsAcceptance":false},"redirection":{"label":"","link":""}}'::jsonb,
  '{"monday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"tuesday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"wednesday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"thursday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"friday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"saturday":{"enabled":false,"openTime":"09:00","closeTime":"17:00"},"sunday":{"enabled":false,"openTime":"09:00","closeTime":"17:00"}}'::jsonb,
  '{"Website":"","Instagram":"","Facebook":"","Tiktok":"","X":"","Youtube":"","LinkedIn":""}'::jsonb,
  '{"primaryEmail":"","primaryPhone":{"countryCode":"+1","number":""},"additionalEmails":[],"additionalPhones":[]}'::jsonb,
  '{"notifyBookingConfirmation":true,"notifyBookingChanges":true,"notifyBookingCancellations":true,"bookingRemindersTime":{"active":true,"type":"email","unit":"hours","value":24},"extraCCEmails":[]}'::jsonb,
  '{"notifyBookingConfirmation":true,"notifyBookingChanges":true,"notifyBookingCancellations":true,"bookingRemindersTime":{"active":true,"type":"email","unit":"hours","value":24}}'::jsonb,
  '{"emailSenderName":"","emailSignature":""}'::jsonb,
  'free',
  'trialing',
  NOW() + INTERVAL '14 days',
  NOW(),
  u.id,
  NOW(),
  u.id,
  NULL,
  NULL,
  FALSE
FROM users u
WHERE u.username = 'afaqjaved';

-- =============================================================================
-- Business-scoped seed users (one per role)
-- Seeds a Business Owner, Admin, Standard, and Enhanced user, all attached to
-- the demo business created above via business_id. Each shares the same seed
-- password hash as the platform owner (admin12345) for convenience in local
-- development. created_by/updated_by are set to the platform owner's id.
--
-- Role           | Email                       | Username
-- ---------------|-----------------------------|---------------
-- Business Owner | businessOwner@pikslots.com  | businessowner
-- Admin           | admin@pikslots.com          | admin
-- Standard        | standard@pikslots.com       | standard
-- Enhanced        | enhanced@pikslots.com       | enhanced
-- =============================================================================
INSERT INTO users (
  id,
  business_id,
  username,
  password,
  first_name,
  last_name,
  email,
  phone,
  role,
  status,
  avatar_url,
  email_verified,
  booking_url,
  notification_mode,
  notification_sound_enabled,
  notification_sound_type,
  reminder_enabled,
  reminder_mins_before,
  reminder_sound_type,
  user_working_hours,
  last_login_at,
  suspended_reason,
  created_at,
  created_by,
  updated_at,
  updated_by,
  deleted_at,
  deleted_by,
  is_deleted
)
SELECT
  v.id,
  '019f3a2d-4c7f-7b8e-a2d5-e9f1c3057b84',
  v.username,
  '$2b$12$oKeoI5cSWasiDKsGarVXAeaSKFMA2N7Kc8mqgsV2h8G9zWEmSyeg2', -- admin12345
  v.first_name,
  v.last_name,
  v.email,
  NULL,
  v.role,
  'active',
  NULL,
  TRUE,
  v.booking_url,
  'all',
  TRUE,
  'chime',
  TRUE,
  10,
  'chime',
  '{"monday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"tuesday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"wednesday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"thursday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"friday":{"enabled":true,"openTime":"09:00","closeTime":"17:00"},"saturday":{"enabled":false,"openTime":"09:00","closeTime":"17:00"},"sunday":{"enabled":false,"openTime":"09:00","closeTime":"17:00"}}'::jsonb,
  NULL,
  NULL,
  NOW(),
  u.id,
  NOW(),
  u.id,
  NULL,
  NULL,
  FALSE
FROM (
  -- id, username, first_name, last_name, email, role, booking_url
  VALUES
    ('019f3a2e-5d1f-7e6a-b3c2-d4e5f6a7b8c9'::uuid, 'businessowner', 'Business', 'Owner', 'businessOwner@pikslots.com', 'Business Owner', 'business-owner'),
    ('019f3a2f-6e2f-7f7b-c4d3-e5f6a7b8c9d0'::uuid, 'admin', 'Admin', 'User', 'admin@pikslots.com', 'Admin', 'admin'),
    ('019f3a30-7f3f-7a8c-d5e4-f6a7b8c9d0e1'::uuid, 'standard', 'Standard', 'User', 'standard@pikslots.com', 'Standard', 'standard'),
    ('019f3a31-8a4f-7b9d-e6f5-a7b8c9d0e1f2'::uuid, 'enhanced', 'Enhanced', 'User', 'enhanced@pikslots.com', 'Enhanced', 'enhanced')
) AS v(id, username, first_name, last_name, email, role, booking_url)
-- CROSS JOIN is safe here since the subquery on the right (users filtered to
-- 'afaqjaved') always yields exactly one row, i.e. one owner id per v row.
CROSS JOIN users u
WHERE u.username = 'afaqjaved';

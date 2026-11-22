import type {
  BusinessIndustry,
  BusinessStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  SupportedCurrencies,
  BrandButtonShape,
  BrandTheme,
  TimeUnit,
  NotificationType,
  WeekDay,
} from './types';
import type {
  BrandDetails,
  BrandAppearanceDetails,
  LocationDetails,
  BookingPolicies,
  BookingSetup,
  BookingContactFields,
  CustomContactField,
  BookingCustomization,
  BookingLabelOverrides,
  BusinessHours,
  BusinessLinks,
  PhoneEntry,
  BusinessContactDetails,
  TeamNotifications,
  CustomerNotifications,
  NotificationCustomization,
} from './value-objects';

// ── Requests ──────────────────────────────────────────────────────────────────

export interface RegisterBusinessInput {
  slug: string;
  name: string;
  industry: BusinessIndustry;
  defaultTimeZone?: string;
}

export interface UpdateBusinessBrandDetailsInput {
  bannerImageUrl: string;
  logoUrl: string;
  name: string;
  slug: string;
  industry: BusinessIndustry;
  about: string;
}

export interface UpdateBusinessLocationInput {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  currency: SupportedCurrencies;
  timeZone: string;
}

export interface UpdateBusinessAppearanceInput {
  brandColor: string;
  brandButtonShape: BrandButtonShape;
  theme: BrandTheme;
  gallaryPhotosUrls: string[];
}

export interface UpdateBusinessGeneralInput {
  language: string;
}

export type UpdateBusinessHoursInput = { businessHours: BusinessHours };

export interface UpdateBusinessNotificationCustomizationInput {
  emailSenderName: string;
  emailSignature: string;
}

export interface UpdateBusinessCustomerNotificationsInput {
  notifyBookingConfirmation: boolean;
  notifyBookingChanges: boolean;
  notifyBookingCancellations: boolean;
  bookingRemindersTime: { active: boolean; type: NotificationType; unit: TimeUnit; value: number };
}

export interface UpdateBusinessTeamNotificationsInput {
  notifyBookingConfirmation: boolean;
  notifyBookingChanges: boolean;
  notifyBookingCancellations: boolean;
  bookingRemindersTime: { active: boolean; type: NotificationType; unit: TimeUnit; value: number };
  extraCCEmails: string[];
}

export interface UpdateBusinessVisibilityInput {
  appearInSearchResults: boolean;
}

export interface UpdateBusinessBookingCustomizationInput {
  language: string;
  timeFormat: '12 hours' | '24 hours';
  weekStartsOn: WeekDay;
  showBookAnotherAppointmentButton: boolean;
  showServiceAndClassPrices: boolean;
  showServiceAndClassDuration: boolean;
  showBusinessHours: boolean;
  showLocalTime: boolean;
  labelService: string;
  labelClass: string;
  labelTeamMember: string;
  labelCity: string;
  labelState: string;
  labelPostalCode: string;
  termsLabel: string;
  termsLink: string;
  requireTermsAcceptance: boolean;
  redirectLabel: string;
  redirectLink: string;
}

export interface UpdateBusinessBookingSetupInput {
  bookAppointmentSectionVisible: boolean;
  bookClassSectionVisible: boolean;
  aboutUsSectionVisible: boolean;
  ourTeamSectionVisible: boolean;
  servicesSectionVisible: boolean;
  classesSectionVisible: boolean;
  showFirstAvailable: boolean;
  skipTeamSelection: boolean;
  allowToBookMultipleServices: boolean;
  bypassTeamMemberSelection: boolean;
  customerLoginEnabled: boolean;
  customerLoginRequired: boolean;
  hidePikslotsBranding: boolean;
  accordionView: boolean;
  allowRescheduling: boolean;
  allowCancellations: boolean;
  showBookNewButton: boolean;
  nameEnabled: boolean;
  nameRequired: boolean;
  emailEnabled: boolean;
  emailRequired: boolean;
  phoneEnabled: boolean;
  phoneRequired: boolean;
  addressEnabled: boolean;
  addressRequired: boolean;
  customFields: CustomContactField[];
}

export interface UpdateBusinessBookingPoliciesInput {
  leadTime: { unit: TimeUnit; value: number };
  scheduleWindow: { unit: TimeUnit; value: number };
  cancellationPolicy: { unit: TimeUnit; value: number } | null;
  bookingPolicyText: string;
  showPolicyOnBookingPage: boolean;
}

export type UpdateBusinessLinksInput = BusinessLinks;

export interface UpdateBusinessContactDetailsInput {
  primaryEmail: string;
  primaryPhone: PhoneEntry;
  additionalEmails: string[];
  additionalPhones: PhoneEntry[];
}

export interface UpdateBusinessBrandDetailsImagesInput {
  bannerImageKey: string;
  brandLogoKey: string;
}

export interface UpdateBusinessGalleryPhotosInput {
  galleryPhotosKeys: string[];
}

// ── Responses ─────────────────────────────────────────────────────────────────

export interface UpdateBusinessBrandDetailsImagesResponse {
  message: 'success';
  oldBannerImageUrl: string | null;
  oldBrandLogoUrl: string | null;
}

export interface UpdateBusinessGalleryPhotosResponse {
  message: 'success';
}

export interface RegisterBusinessResponse {
  message: 'success';
}

export interface BusinessResponse {
  // core
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  industry: BusinessIndustry;
  about: string;
  appearInSearchResults: boolean;
  status: BusinessStatus;
  suspendedReason: string | null;
  // settings
  brandDetail: BrandDetails;
  brandAppearanceDetails: BrandAppearanceDetails;
  locationDetails: LocationDetails;
  bookingPolicies: BookingPolicies;
  bookingSetup: BookingSetup;
  bookingContactFields: BookingContactFields;
  bookingCustomization: BookingCustomization;
  bookingLabelOverrides: BookingLabelOverrides;
  // business hours & links
  businessHours: BusinessHours;
  businessLinks: BusinessLinks;
  contactDetails: BusinessContactDetails;
  // notifications
  teamNotifications: TeamNotifications;
  customerNotifications: CustomerNotifications;
  notificationCustomization: NotificationCustomization;
  // subscription
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  // audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export type GetAllBusinessesResponse = BusinessResponse[];
export type GetBusinessByIdResponse = BusinessResponse;

export type UpdateBusinessBrandDetailsResponse = BusinessResponse;
export type UpdateBusinessLocationResponse = BusinessResponse;
export type UpdateBusinessAppearanceResponse = BusinessResponse;
export type UpdateBusinessGeneralResponse = BusinessResponse;
export type UpdateBusinessBookingPoliciesResponse = BusinessResponse;
export type UpdateBusinessBookingSetupResponse = BusinessResponse;
export type UpdateBusinessBookingCustomizationResponse = BusinessResponse;
export type UpdateBusinessTeamNotificationsResponse = BusinessResponse;
export type UpdateBusinessCustomerNotificationsResponse = BusinessResponse;
export type UpdateBusinessNotificationCustomizationResponse = BusinessResponse;
export type UpdateBusinessHoursResponse = BusinessResponse;
export type UpdateBusinessLinksResponse = BusinessResponse;
export type UpdateBusinessVisibilityResponse = BusinessResponse;
export type UpdateBusinessContactDetailsResponse = BusinessResponse;

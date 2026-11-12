import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Res,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { mapBusinessError } from './errors/business.errors.map';
import { AuditLog } from '../audit-log/decorators/audit.log.decorator';
import { AuditLogInterceptor } from '../audit-log/interceptors/audit.log.interceptor';
import { PIKSLOT_EVENTS } from 'src/shared/queue/jobs/pikslot.events';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';
import { RegisterBusinessDto } from './dto/register.business.dto';
import { UpdateBusinessBrandDetailsDto } from './dto/update.business.brand.details.dto';
import { UpdateBusinessAppearanceDto } from './dto/update.business.appearance.dto';
import { UpdateBusinessLocationDto } from './dto/update.business.location.dto';
import { UpdateBusinessGeneralDto } from './dto/update.business.general.dto';
import { UpdateBusinessBookingPoliciesDto } from './dto/update.business.booking.policies.dto';
import { UpdateBusinessBookingSetupDto } from './dto/update.business.booking.setup.dto';
import { UpdateBusinessBookingCustomizationDto } from './dto/update.business.booking.customization.dto';
import { UpdateBusinessVisibilityDto } from './dto/update.business.visibility.dto';
import { UpdateBusinessTeamNotificationsDto } from './dto/update.business.team.notifications.dto';
import { UpdateBusinessCustomerNotificationsDto } from './dto/update.business.customer.notifications.dto';
import { UpdateBusinessNotificationCustomizationDto } from './dto/update.business.notification.customization.dto';
import { UpdateBusinessHoursDto } from './dto/update.business.hours.dto';
import { UpdateBusinessLinksDto } from './dto/update.business.links.dto';
import { UpdateBusinessContactDetailsDto } from './dto/update.business.contact.details.dto';
import { UpdateBusinessBrandDetailsImagesDto } from './dto/update.business.brand.details.images.dto';
import { UpdateBusinessGalleryPhotosDto } from './dto/update.business.gallery.photos.dto';
import {
  GetAllBusinessesDocs,
  GetBusinessByIdDocs,
  RegisterBusinessDocs,
  UpdateBusinessAppearanceDocs,
  UpdateBusinessBookingCustomizationDocs,
  UpdateBusinessBookingPoliciesDocs,
  UpdateBusinessBookingSetupDocs,
  UpdateBusinessBrandDetailsDocs,
  UpdateBusinessGalleryPhotosDocs,
  UpdateBusinessGeneralDocs,
  UpdateBusinessLocationDocs,
  UpdateBusinessTeamNotificationsDocs,
  UpdateBusinessCustomerNotificationsDocs,
  UpdateBusinessNotificationCustomizationDocs,
  UpdateBusinessHoursDocs,
  UpdateBusinessVisibilityDocs,
  UpdateBusinessLinksDocs,
  UpdateBusinessContactDetailsDocs,
  UpdateBusinessBrandDetailsImagesDocs,
} from './docs/business.controller.docs';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';
import { PikslotsBaseResponse } from 'src/shared/types/base.response';
import type {
  GetAllBusinessesResponse,
  GetBusinessByIdResponse,
  RegisterBusinessResponse,
  UpdateBusinessAppearanceResponse,
  UpdateBusinessBookingCustomizationResponse,
  UpdateBusinessBookingPoliciesResponse,
  UpdateBusinessBookingSetupResponse,
  UpdateBusinessBrandDetailsImagesResponse,
  UpdateBusinessBrandDetailsResponse,
  UpdateBusinessGeneralResponse,
  UpdateBusinessLocationResponse,
  UpdateBusinessTeamNotificationsResponse,
  UpdateBusinessCustomerNotificationsResponse,
  UpdateBusinessNotificationCustomizationResponse,
  UpdateBusinessHoursResponse,
  UpdateBusinessVisibilityResponse,
  UpdateBusinessLinksResponse,
  UpdateBusinessContactDetailsResponse,
} from '@pikslots/shared';
import { BusinessUseCaseFactory } from './factroy/business.usecases.factory';
import { RolesGuard } from 'src/shared/security/guards/roles.guard';
import { Roles } from 'src/shared/security/guards/roles.decorator';
import { BusinessResponseMapper } from './mappers/business.response.mapper';
import {
  IPikslotS3Service,
  type PikslotS3Service,
} from 'src/shared/s3/s3.service';

@ApiTags('Businesses')
@Controller('')
@UseInterceptors(AuditLogInterceptor)
export class BusinessController {
  constructor(
    private readonly businessUseCaseFactory: BusinessUseCaseFactory,
    @Inject(IPikslotS3Service) private readonly s3Service: PikslotS3Service,
  ) {}

  @RegisterBusinessDocs()
  @Post(BUSINESS_ENDPOINTS.REGISTER)
  @Roles('Platform Owner')
  async registerBusiness(
    @Res({ passthrough: true }) res: Response,
    @Body() registerBusinessDto: RegisterBusinessDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<RegisterBusinessResponse>
  > {
    const result =
      await this.businessUseCaseFactory.registerBusinessUseCase.execute(
        registerBusinessDto,
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.CREATED);
    return new PikslotsBaseResponse(result.value, HttpStatus.CREATED);
  }

  @GetBusinessByIdDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Standard', 'Enhanced')
  @Get(BUSINESS_ENDPOINTS.GET_BY_ID)
  async getBusinessById(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<GetBusinessByIdResponse>
  > {
    const result =
      await this.businessUseCaseFactory.findBusinessByIdUseCase.execute(id);

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: GetBusinessByIdResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @GetAllBusinessesDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner')
  @Get(BUSINESS_ENDPOINTS.GET_ALL)
  async getAllBusinesses(
    @Res({ passthrough: true }) res: Response,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<GetAllBusinessesResponse>
  > {
    const result =
      await this.businessUseCaseFactory.findAllRegisteredBusinessesUseCase.execute();

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const businesses: GetAllBusinessesResponse = await Promise.all(
      result.value.map((b) =>
        BusinessResponseMapper.toBusinessResponse(b, this.s3Service),
      ),
    );

    res.status(HttpStatus.OK);

    return new PikslotsBaseResponse(businesses, HttpStatus.OK);
  }

  @UpdateBusinessBrandDetailsDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_BRAND_DETAILS_UPDATED,
    description: 'Updated brand details',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_BRAND_DETAILS)
  async updateBusinessBrandDetails(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessBrandDetailsDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessBrandDetailsResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessBrandDetailsUseCase.execute(
        {
          id,
          bannerImageUrl: dto.bannerImageUrl,
          logoUrl: dto.logoUrl,
          name: dto.name,
          slug: dto.slug,
          industry: dto.industry,
          about: dto.about,
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessBrandDetailsResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessAppearanceDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_APPEARANCE_UPDATED,
    description: 'Updated appearance settings',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_APPEARANCE)
  async updateBusinessAppearance(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessAppearanceDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessAppearanceResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessAppearanceUseCase.execute(
        {
          id,
          brandColor: dto.brandColor,
          brandButtonShape: dto.brandButtonShape,
          theme: dto.theme,
          gallaryPhotosUrls: dto.gallaryPhotosUrls,
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessAppearanceResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessLocationDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_LOCATION_UPDATED,
    description: 'Updated location',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_LOCATION)
  async updateBusinessLocation(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessLocationDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessLocationResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessLocationUseCase.execute({
        id,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
        country: dto.country,
        currency: dto.currency,
        timeZone: dto.timeZone,
      });

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessLocationResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessGeneralDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_GENERAL_UPDATED,
    description: 'Updated general settings',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_GENERAL)
  async updateBusinessGeneral(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessGeneralDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessGeneralResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessGeneralUseCase.execute({
        id,
        language: dto.language,
      });

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessGeneralResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessBookingPoliciesDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_BOOKING_POLICIES_UPDATED,
    description: 'Updated booking policies',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_BOOKING_POLICIES)
  async updateBusinessBookingPolicies(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessBookingPoliciesDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessBookingPoliciesResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessBookingPoliciesUseCase.execute(
        {
          id,
          leadTime: dto.leadTime,
          scheduleWindow: dto.scheduleWindow,
          cancellationPolicy: dto.cancellationPolicy,
          bookingPolicyText: dto.bookingPolicyText,
          showPolicyOnBookingPage: dto.showPolicyOnBookingPage,
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessBookingPoliciesResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessBookingSetupDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_BOOKING_SETUP_UPDATED,
    description: 'Updated booking setup',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_BOOKING_SETUP)
  async updateBusinessBookingSetup(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessBookingSetupDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessBookingSetupResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessBookingSetupUseCase.execute(
        {
          id,
          bookAppointmentSectionVisible: dto.bookAppointmentSectionVisible,
          bookClassSectionVisible: dto.bookClassSectionVisible,
          aboutUsSectionVisible: dto.aboutUsSectionVisible,
          ourTeamSectionVisible: dto.ourTeamSectionVisible,
          servicesSectionVisible: dto.servicesSectionVisible,
          classesSectionVisible: dto.classesSectionVisible,
          showFirstAvailable: dto.showFirstAvailable,
          skipTeamSelection: dto.skipTeamSelection,
          allowToBookMultipleServices: dto.allowToBookMultipleServices,
          bypassTeamMemberSelection: dto.bypassTeamMemberSelection,
          customerLoginEnabled: dto.customerLoginEnabled,
          customerLoginRequired: dto.customerLoginRequired,
          hidePikslotsBranding: dto.hidePikslotsBranding,
          accordionView: dto.accordionView,
          allowRescheduling: dto.allowRescheduling,
          allowCancellations: dto.allowCancellations,
          showBookNewButton: dto.showBookNewButton,
          nameEnabled: dto.nameEnabled,
          nameRequired: dto.nameRequired,
          emailEnabled: dto.emailEnabled,
          emailRequired: dto.emailRequired,
          phoneEnabled: dto.phoneEnabled,
          phoneRequired: dto.phoneRequired,
          addressEnabled: dto.addressEnabled,
          addressRequired: dto.addressRequired,
          customFields: dto.customFields,
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessBookingSetupResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessBookingCustomizationDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_BOOKING_CUSTOMIZATION_UPDATED,
    description: 'Updated booking customization',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_BOOKING_CUSTOMIZATION)
  async updateBusinessBookingCustomization(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessBookingCustomizationDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessBookingCustomizationResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessBookingCustomizationUseCase.execute(
        {
          id,
          language: dto.language,
          timeFormat: dto.timeFormat,
          weekStartsOn: dto.weekStartsOn,
          showBookAnotherAppointmentButton:
            dto.showBookAnotherAppointmentButton,
          showServiceAndClassPrices: dto.showServiceAndClassPrices,
          showServiceAndClassDuration: dto.showServiceAndClassDuration,
          showBusinessHours: dto.showBusinessHours,
          showLocalTime: dto.showLocalTime,
          labelService: dto.labelService,
          labelClass: dto.labelClass,
          labelTeamMember: dto.labelTeamMember,
          labelCity: dto.labelCity,
          labelState: dto.labelState,
          labelPostalCode: dto.labelPostalCode,
          termsLabel: dto.termsLabel,
          termsLink: dto.termsLink,
          requireTermsAcceptance: dto.requireTermsAcceptance,
          redirectLabel: dto.redirectLabel,
          redirectLink: dto.redirectLink,
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessBookingCustomizationResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessVisibilityDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_VISIBILITY_UPDATED,
    description: 'Updated booking page visibility',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_VISIBILITY)
  async updateBusinessVisibility(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessVisibilityDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessVisibilityResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessVisibilityUseCase.execute(
        {
          id,
          appearInSearchResults: dto.appearInSearchResults,
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessVisibilityResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessTeamNotificationsDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_TEAM_NOTIFICATIONS_UPDATED,
    description: 'Updated team notifications',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_TEAM_NOTIFICATIONS)
  async updateBusinessTeamNotifications(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessTeamNotificationsDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessTeamNotificationsResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessTeamNotificationsUseCase.execute(
        {
          id,
          notifyBookingConfirmation: dto.notifyBookingConfirmation,
          notifyBookingChanges: dto.notifyBookingChanges,
          notifyBookingCancellations: dto.notifyBookingCancellations,
          bookingRemindersTime: dto.bookingRemindersTime,
          extraCCEmails: dto.extraCCEmails,
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessTeamNotificationsResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessCustomerNotificationsDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_CUSTOMER_NOTIFICATIONS_UPDATED,
    description: 'Updated customer notifications',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_CUSTOMER_NOTIFICATIONS)
  async updateBusinessCustomerNotifications(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessCustomerNotificationsDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessCustomerNotificationsResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessCustomerNotificationsUseCase.execute(
        {
          id,
          notifyBookingConfirmation: dto.notifyBookingConfirmation,
          notifyBookingChanges: dto.notifyBookingChanges,
          notifyBookingCancellations: dto.notifyBookingCancellations,
          bookingRemindersTime: dto.bookingRemindersTime,
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessCustomerNotificationsResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessNotificationCustomizationDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action:
      PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_NOTIFICATION_CUSTOMIZATION_UPDATED,
    description: 'Updated notification customization',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_NOTIFICATION_CUSTOMIZATION)
  async updateBusinessNotificationCustomization(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessNotificationCustomizationDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessNotificationCustomizationResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessNotificationCustomizationUseCase.execute(
        {
          id,
          emailSenderName: dto.emailSenderName,
          emailSignature: dto.emailSignature,
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessNotificationCustomizationResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessHoursDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_HOURS_UPDATED,
    description: 'Updated business hours',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_BUSINESS_HOURS)
  async updateBusinessHours(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessHoursDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessHoursResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessHoursUseCase.execute({
        id,
        businessHours: {
          monday: dto.monday,
          tuesday: dto.tuesday,
          wednesday: dto.wednesday,
          thursday: dto.thursday,
          friday: dto.friday,
          saturday: dto.saturday,
          sunday: dto.sunday,
        },
      });

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessHoursResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessLinksDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_LINKS_UPDATED,
    description: 'Updated social links',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_BUSINESS_LINKS)
  async updateBusinessLinks(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessLinksDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessLinksResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessLinksUseCase.execute({
        id,
        businessLinks: {
          Website: dto.Website,
          Instagram: dto.Instagram,
          Facebook: dto.Facebook,
          Tiktok: dto.Tiktok,
          X: dto.X,
          Youtube: dto.Youtube,
          LinkedIn: dto.LinkedIn,
        },
      });

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessLinksResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessContactDetailsDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_CONTACT_DETAILS_UPDATED,
    description: 'Updated contact details',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_CONTACT_DETAILS)
  async updateBusinessContactDetails(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessContactDetailsDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessContactDetailsResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessContactDetailsUseCase.execute(
        {
          id,
          contactDetails: {
            primaryEmail: dto.primaryEmail,
            primaryPhone: dto.primaryPhone,
            additionalEmails: dto.additionalEmails,
            additionalPhones: dto.additionalPhones,
          },
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const response: UpdateBusinessContactDetailsResponse =
      await BusinessResponseMapper.toBusinessResponse(
        result.value,
        this.s3Service,
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(response, HttpStatus.OK);
  }

  @UpdateBusinessBrandDetailsImagesDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_BRAND_IMAGES_UPDATED,
    description: 'Updated brand images',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_BRAND_DETAILS_IMAGES)
  async updateBusinessBrandDetailsImages(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessBrandDetailsImagesDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateBusinessBrandDetailsImagesResponse>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessBrandDetailsImagesUseCase.execute(
        {
          businessId: id,
          bannerImageKey: dto.bannerImageKey,
          brandLogoKey: dto.brandLogoKey,
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);

    return new PikslotsBaseResponse(
      {
        message: 'success' as const,
        oldBannerImageUrl: result.value.oldBannerImageUrl,
        oldBrandLogoUrl: result.value.oldBrandLogoUrl,
      },
      HttpStatus.OK,
    );
  }
  @UpdateBusinessGalleryPhotosDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @AuditLog({
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_GALLERY_UPDATED,
    description: 'Updated gallery photos',
  })
  @Patch(BUSINESS_ENDPOINTS.UPDATE_GALLERY_PHOTOS)
  async updateBusinessGalleryPhotos(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessGalleryPhotosDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<{ message: 'success' }>
  > {
    const result =
      await this.businessUseCaseFactory.updateBusinessGalleryPhotosUseCase.execute(
        {
          id,
          galleryPhotosKeys: dto.galleryPhotosKeys,
        },
      );

    if (!result.ok) {
      const errorResponse = mapBusinessError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(
      { message: 'success' as const },
      HttpStatus.OK,
    );
  }
}

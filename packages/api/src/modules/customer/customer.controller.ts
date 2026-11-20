import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';
import { PikslotsBaseResponse } from 'src/shared/types/base.response';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { RolesGuard } from 'src/shared/security/guards/roles.guard';
import { Roles } from 'src/shared/security/guards/roles.decorator';
import { mapCustomerError } from './errors/customer.errors.map';
import { CUSTOMER_ENDPOINTS } from '@pikslots/shared';
import { RegisterCustomerDto } from './dto/register.customer.dto';
import { EditCustomerDto } from './dto/edit.customer.dto';
import { UpdateCustomerProfileImageDto } from './dto/update.customer.profile.image.dto';
import {
  RegisterCustomerDocs,
  EditCustomerDocs,
  DeleteCustomerDocs,
  FindAllCustomersByBusinessDocs,
  FindCustomerByIdDocs,
  UpdateCustomerProfileImageDocs,
  DebounceCustomerSearchDocs,
  ExportCustomersByBusinessDocs,
} from './docs/customer.controller.docs';
import { CustomerUseCasesFactory } from './factory/customer.usecases.factory';
import type {
  RegisterCustomerResponse,
  FindAllCustomersByBusinessResponse,
  EditCustomerResponse,
  DeleteCustomerResponse,
  FindCustomerByIdResponse,
  UpdateCustomerProfileImageResponse,
  DebounceCustomerSearchByBusinessResponse,
} from '@pikslots/shared';
import { CustomerResponseMapper } from './mappers/customer.reponse.mapper';
import {
  IPikslotS3Service,
  type PikslotS3Service,
} from 'src/shared/s3/s3.service';
import { DebounceCustomerSearchDto } from './dto/debounce.customer.search.dto';
import { toCustomersCsv } from './mappers/customer.csv.mapper';
import { CSV_BOM } from 'src/shared/csv/csv.util';

@ApiTags('Customers')
@Controller('')
export class CustomerController {
  constructor(
    private readonly customerUseCasesFactory: CustomerUseCasesFactory,
    private readonly securityContext: SecurityContext,
    @Inject(IPikslotS3Service) private readonly s3Service: PikslotS3Service,
  ) {}

  @RegisterCustomerDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Post(CUSTOMER_ENDPOINTS.REGISTER)
  async registerCustomer(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RegisterCustomerDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<RegisterCustomerResponse>
  > {
    const result =
      await this.customerUseCasesFactory.registerCustomerUseCase.execute({
        name: { firstName: dto.firstName, lastName: dto.lastName },
        profileImageUrl: dto.profileImageUrl,
        email: dto.email,
        additionalEmail: dto.additionalEmail,
        primaryPhone: dto.primaryPhone,
        additionalPhone: dto.additionalPhone,
        company: dto.company,
        country: dto.country,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        notes: dto.notes,
        customerSocialLinks: dto.customerSocialLinks,
        additionalFields: dto.additionalFields ?? null,
        businessId: dto.businessId,
        createdBy: this.securityContext.userId,
      });

    if (!result.ok) {
      const errorResponse = mapCustomerError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.CREATED);
    return new PikslotsBaseResponse<RegisterCustomerResponse>(
      { message: 'success' },
      HttpStatus.CREATED,
    );
  }

  @EditCustomerDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Patch(CUSTOMER_ENDPOINTS.EDIT)
  async editCustomer(
    @Res({ passthrough: true }) res: Response,
    @Param('customerId') customerId: string,
    @Body() dto: EditCustomerDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<EditCustomerResponse>
  > {
    const result =
      await this.customerUseCasesFactory.editCustomerUseCase.execute({
        id: customerId,
        name: { firstName: dto.firstName, lastName: dto.lastName },
        profileImageUrl: dto.profileImageUrl,
        email: dto.email,
        additionalEmail: dto.additionalEmail,
        primaryPhone: dto.primaryPhone,
        additionalPhone: dto.additionalPhone,
        company: dto.company,
        country: dto.country,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        notes: dto.notes,
        customerSocialLinks: dto.customerSocialLinks,
        businessId: dto.businessId,
        updatedBy: this.securityContext.userId,
      });

    if (!result.ok) {
      const errorResponse = mapCustomerError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<EditCustomerResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  @DeleteCustomerDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @Delete(CUSTOMER_ENDPOINTS.DELETE)
  async deleteCustomer(
    @Res({ passthrough: true }) res: Response,
    @Param('customerId') customerId: string,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<DeleteCustomerResponse>
  > {
    const result =
      await this.customerUseCasesFactory.deleteCustomerUseCase.execute({
        id: customerId,
        deletedBy: this.securityContext.userId,
      });

    if (!result.ok) {
      const errorResponse = mapCustomerError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<DeleteCustomerResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  @FindCustomerByIdDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Get(CUSTOMER_ENDPOINTS.FIND_BY_ID)
  async findCustomerById(
    @Res({ passthrough: true }) res: Response,
    @Param('customerId') customerId: string,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<FindCustomerByIdResponse>
  > {
    const result =
      await this.customerUseCasesFactory.findCustomerByIdUseCase.execute({
        customerId,
      });

    if (!result.ok) {
      const errorResponse = mapCustomerError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const customer: FindCustomerByIdResponse =
      await CustomerResponseMapper.toCustomerResponse(
        result.value,
        this.s3Service,
      );

    const c = customer;
    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<FindCustomerByIdResponse>(
      {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        profileImageUrl: c.profileImageUrl,
        email: c.email,
        additionalEmail: c.additionalEmail,
        primaryPhone: c.primaryPhone,
        additionalPhone: c.additionalPhone,
        company: c.company,
        country: c.country,
        address: c.address,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        notes: c.notes,
        customerSocialLinks: c.customerSocialLinks,
        additionalFields: c.additionalFields,
        businessId: c.businessId,
      },
      HttpStatus.OK,
    );
  }

  @FindAllCustomersByBusinessDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Get(CUSTOMER_ENDPOINTS.FIND_ALL_BY_BUSINESS)
  async findAllByBusiness(
    @Res({ passthrough: true }) res: Response,
    @Param('businessId') businessId: string,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<FindAllCustomersByBusinessResponse>
  > {
    const result =
      await this.customerUseCasesFactory.findAllCustomersByBusinessUseCase.execute(
        businessId,
      );

    if (!result.ok) {
      const errorResponse = mapCustomerError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const customer: FindAllCustomersByBusinessResponse = await Promise.all(
      result.value.map((customer) =>
        CustomerResponseMapper.toPartialCustomerResponse(
          {
            id: customer.id,
            firstName: customer.fullName.firstName,
            lastName: customer.fullName.lastName,
            email: customer.email,
            profileImageUrl: customer.profileImageUrl,
          },
          this.s3Service,
        ),
      ),
    );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<FindAllCustomersByBusinessResponse>(
      customer.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        profileImageUrl: c.profileImageUrl,
      })),
      HttpStatus.OK,
    );
  }

  @ExportCustomersByBusinessDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Get(CUSTOMER_ENDPOINTS.EXPORT_BY_BUSINESS)
  async exportCustomersByBusiness(
    @Res({ passthrough: true }) res: Response,
    @Param('businessId') businessId: string,
  ): Promise<PikslotsBaseErrorResponse | string> {
    const result =
      await this.customerUseCasesFactory.exportCustomersByBusinessUseCase.execute(
        businessId,
      );

    if (!result.ok) {
      const errorResponse = mapCustomerError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const fileName = `customers-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(HttpStatus.OK);

    return CSV_BOM + toCustomersCsv(result.value);
  }

  @UpdateCustomerProfileImageDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Patch(CUSTOMER_ENDPOINTS.UPDATE_PROFILE_IMAGE)
  async updateProfileImage(
    @Res({ passthrough: true }) res: Response,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerProfileImageDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateCustomerProfileImageResponse>
  > {
    const result =
      await this.customerUseCasesFactory.updateCustomerProfileImageUseCase.execute(
        {
          customerId,
          profileImageKey: dto.profileImageKey,
        },
      );

    if (!result.ok) {
      const errorResponse = mapCustomerError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<UpdateCustomerProfileImageResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  @DebounceCustomerSearchDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Post(CUSTOMER_ENDPOINTS.DEBOUNCE_CUSTOMER_SEARCH_BY_BUSINESS)
  async debounceCustomerSearch(
    @Res({ passthrough: true }) res: Response,
    @Param('businessId') businessId: string,
    @Body() dto: DebounceCustomerSearchDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<DebounceCustomerSearchByBusinessResponse>
  > {
    const result =
      await this.customerUseCasesFactory.debounceCustomerSearchByBusinessIdUseCase.execute(
        businessId,
        dto.searchString,
      );

    if (!result.ok) {
      const errorResponse = mapCustomerError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const customers = result.value;

    if (customers.length === 0) {
      res.status(HttpStatus.OK);
      return new PikslotsBaseResponse<DebounceCustomerSearchByBusinessResponse>(
        [],
        HttpStatus.OK,
      );
    }

    const customerResponses: DebounceCustomerSearchByBusinessResponse =
      await Promise.all(
        customers.map((customer) =>
          CustomerResponseMapper.toPartialCustomerResponse(
            {
              id: customer.id,
              firstName: customer.fullName.firstName,
              lastName: customer.fullName.lastName,
              email: customer.email,
              profileImageUrl: customer.profileImageUrl,
            },
            this.s3Service,
          ),
        ),
      );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<DebounceCustomerSearchByBusinessResponse>(
      customerResponses.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        profileImageUrl: c.profileImageUrl,
      })),
      HttpStatus.OK,
    );
  }
}

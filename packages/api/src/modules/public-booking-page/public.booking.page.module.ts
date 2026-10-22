import { Module } from '@nestjs/common';
import { PublicBookingPageController } from './public.booking.page.controller';
import { PublicBookingPageRepositoryImpl } from './repository/public.booking.page.repository.impl';
import { IPublicBookingPageRepository } from '@pikslots/domain';
import { PublicBookingPageUseCaseFactory } from './factory/public.booking.page.usecases.factory';
import { PUBLIC_BOOKING_PAGE_USECASES } from './usecase';
import { BookingModule } from '../booking/booking.module';
import { BusinessModule } from '../business/business.module';
import { CustomerModule } from '../customer/customer.module';
import { ServiceModule } from '../service/service.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    BookingModule,
    BusinessModule,
    CustomerModule,
    ServiceModule,
    UserModule,
  ],
  controllers: [PublicBookingPageController],
  providers: [
    {
      provide: IPublicBookingPageRepository,
      useClass: PublicBookingPageRepositoryImpl,
    },
    PublicBookingPageUseCaseFactory,
    ...PUBLIC_BOOKING_PAGE_USECASES,
  ],
})
export class PublicBookingPage {}

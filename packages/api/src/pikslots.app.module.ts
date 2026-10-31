import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PikslotsConfigModule } from './shared/config/pikslots.config.module';
import { PikslotsDatabaseModule } from './shared/database/pikslots.database.module';
import { UserModule } from './modules/user/user.module';
import { PikslotsSecurityModule } from './shared/security/pikslots.security.module';
// import { JwtVerificationMiddleware } from './shared/security/middleware/jwt.verficiation.middleware';
import { BusinessModule } from './modules/business/business.module';
import { PikslotsQueueModule } from './shared/queue/pikslots.queue.module';
import { PikslotEmailModule } from './shared/email/pikslot.email.module';
import { PikslotCacheModule } from './shared/cache/pikslot.cache.module';
import { ServiceModule } from './modules/service/service.module';
import { ServiceGroupModule } from './modules/service-group/service.group.module';
import { ServiceGroupAssignmentModule } from './modules/service-group-assignment/service.group.assignment.module';
import { ServiceUserAssignmentModule } from './modules/service-user-assignment/service.user.assignment.module';
import { ClassModule } from './modules/class/class.module';
import { ClassGroupModule } from './modules/class-group/class.group.module';
import { ClassGroupAssignmentModule } from './modules/class-group-assignment/class.group.assignment.module';
import { CustomerModule } from './modules/customer/customer.module';
import { TimeoffModule } from './modules/timeoff/timeoff.module';
import { BookingModule } from './modules/booking/booking.module';
import { BreakModule } from './modules/break/break.module';
import { PikslotS3Module } from './shared/s3/s3.module';
import { PublicBookingPage } from './modules/public-booking-page/public.booking.page.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { HealtController } from './health.controller';
import { AuditLogModule } from './modules/audit-log/audit.log.module';
import { SessionModule } from './modules/session/session.module';
import { SessionVerifcationMiddleware } from './shared/security/middleware/session.verifcation.middleware';

@Module({
  imports: [
    PikslotsSecurityModule,
    PikslotsConfigModule,
    PikslotsDatabaseModule, // also runs the migrations
    PikslotsQueueModule,
    PikslotEmailModule,
    PikslotCacheModule,
    PikslotS3Module,

    // domain modules
    UserModule,
    BusinessModule,
    ServiceModule,
    ServiceGroupModule,
    ServiceGroupAssignmentModule,
    ServiceUserAssignmentModule,
    ClassModule,
    ClassGroupModule,
    ClassGroupAssignmentModule,
    CustomerModule,
    TimeoffModule,
    BookingModule,
    BreakModule,
    PublicBookingPage,
    OnboardingModule,
    AuditLogModule,
    SessionModule,
  ],
  controllers: [HealtController],
  providers: [],
})
export class PikslotsAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    //consumer.apply(JwtVerificationMiddleware).forRoutes('*');
    consumer.apply(SessionVerifcationMiddleware).forRoutes('*');
  }
}

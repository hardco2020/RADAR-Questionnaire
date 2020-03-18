import { CommonModule, DatePipe } from '@angular/common'
import { NgModule } from '@angular/core'

import { AppConfigService } from '../core/services/config/app-config.service'
import { ConfigService } from '../core/services/config/config.service'
import { ProtocolService } from '../core/services/config/protocol.service'
import { QuestionnaireService } from '../core/services/config/questionnaire.service'
import { SubjectConfigService } from '../core/services/config/subject-config.service'
import { KafkaService } from '../core/services/kafka/kafka.service'
import { SchemaService } from '../core/services/kafka/schema.service'
import { AlertService } from '../core/services/misc/alert.service'
import { LocalizationService } from '../core/services/misc/localization.service'
import { AppServerRestNotificationService } from '../core/services/notifications/app-server-rest-notification.service'
import { FcmXmppNotificationService } from '../core/services/notifications/fcm-xmpp-notification.service'
import { LocalNotificationService } from '../core/services/notifications/local-notification.service'
import { NotificationGeneratorService } from '../core/services/notifications/notification-generator.service'
import { NotificationWrapperService } from '../core/services/notifications/notification-wrapper.service'
import { NotificationService } from '../core/services/notifications/notification.service'
import { ScheduleGeneratorService } from '../core/services/schedule/schedule-generator.service'
import { ScheduleService } from '../core/services/schedule/schedule.service'
import { StorageService } from '../core/services/storage/storage.service'
import { TokenService } from '../core/services/token/token.service'
import { AnalyticsService } from '../core/services/usage/analytics.service'
import { FirebaseAnalyticsService } from '../core/services/usage/firebase-analytics.service'
import { UsageService } from '../core/services/usage/usage.service'
import { PipesModule } from '../shared/pipes/pipes.module'
import { TranslatePipe } from '../shared/pipes/translate/translate'
import { AuthModule } from './auth/auth.module'
import { ClinicalTasksModule } from './clinical-tasks/clinical-tasks.module'
import { HomeModule } from './home/home.module'
import { QuestionsModule } from './questions/questions.module'
import { ReportModule } from './report/report.module'
import { SettingsModule } from './settings/settings.module'
import { SplashModule } from './splash/splash.module'

@NgModule({
  imports: [
    PipesModule,
    CommonModule,
    AuthModule,
    ClinicalTasksModule,
    HomeModule,
    QuestionsModule,
    ReportModule,
    SettingsModule,
    SplashModule
  ],
  providers: [
    AlertService,
    DatePipe,
    ConfigService,
    AppConfigService,
    SubjectConfigService,
    ProtocolService,
    QuestionnaireService,
    TokenService,
    KafkaService,
    LocalizationService,
    ScheduleService,
    ScheduleGeneratorService,
    StorageService,
    TranslatePipe,
    UsageService,
    SchemaService,
    NotificationGeneratorService,
    AppServerRestNotificationService,
    FcmXmppNotificationService,
    LocalNotificationService,
    { provide: NotificationService, useClass: NotificationWrapperService },
    { provide: AnalyticsService, useClass: FirebaseAnalyticsService }
  ]
})
export class PagesModule {}

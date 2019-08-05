import { Component } from '@angular/core'
import { MobileAccessibility } from '@ionic-native/mobile-accessibility/ngx'
import { NotificationService } from '../services/notifications/notification.service'
import { Platform } from 'ionic-angular'
import { SplashPageComponent } from '../../pages/splash/containers/splash-page.component'
import { SplashScreen } from '@ionic-native/splash-screen/ngx'
import { StatusBar } from '@ionic-native/status-bar/ngx'

@Component({
  template: '<ion-nav [root]="rootPage"></ion-nav>'
})
export class AppComponent {
  rootPage = SplashPageComponent

  constructor(
    private platform: Platform,
    private statusBar: StatusBar,
    private splashScreen: SplashScreen,
    private accessibility: MobileAccessibility,
    private notificationService: NotificationService
  ) {
    this.platform.ready().then(() => {
      this.accessibility.usePreferredTextZoom(false)
      this.statusBar.hide()
      this.splashScreen.hide()
      this.notificationService.init()
      return this.notificationService.permissionCheck()
    })
  }
}

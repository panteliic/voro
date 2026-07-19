import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Language = 'en' | 'sr'

const LANGUAGE_STORAGE_KEY = 'voro-language'

const dictionaries: Record<Language, Record<string, string>> = {
  en: {
    'common.english': 'English',
    'common.serbian': 'Serbian',
    'common.refresh': 'Refresh',
    'common.logout': 'Logout',
    'common.order': 'Order',
    'common.items': 'Items',
    'common.total': 'Total',
    'common.status': 'Status',
    'common.date': 'Date',

    'status.New': 'New',
    'status.Preparing': 'Preparing',
    'status.Ready': 'Ready',
    'status.Delivered': 'Delivered',
    'status.Cancelled': 'Cancelled',
    'status.pending': 'New',
    'status.accepted': 'Accepted',
    'status.preparing': 'Preparing',
    'status.ready': 'Ready',
    'status.picked_up': 'Picked up',
    'status.delivered': 'Delivered',
    'status.cancelled': 'Cancelled',

    'nav.activeOrders': 'Active orders',
    'nav.dashboard': 'Dashboard',
    'nav.calendar': 'Calendar',
    'nav.menu': 'Menu',

    'restaurant.privateAccess': 'Private console access',
    'restaurant.adminOnly': 'Admin-issued accounts only',
    'restaurant.console': 'Restaurant Console',

    'auth.signIn': 'Restaurant sign in',
    'auth.signInDesc': 'Open your operations console.',
    'auth.email': 'Restaurant email',
    'auth.restaurantEmail': 'Restaurant console email',
    'auth.password': 'Password',
    'auth.opening': 'Opening console...',
    'auth.openConsole': 'Open operations console',
    'auth.setupCodeAccess': 'Setup code access',
    'auth.firstAccess': 'First access',
    'auth.resetPassword': 'Reset password',
    'auth.firstAccessTitle': 'First restaurant access',
    'auth.firstAccessDesc': 'Use the admin invite code once, then create the owner password.',
    'auth.passwordResetTitle': 'Password reset',
    'auth.passwordResetDesc': 'Use the new code from admin to replace the old password.',
    'auth.setupCode': 'Setup code from admin',
    'auth.createPassword': 'Create restaurant password',
    'auth.createNewPassword': 'Create new password',
    'auth.savingPassword': 'Saving password...',
    'auth.setNewPassword': 'Set new password',
    'auth.backToSignIn': 'Back to sign in',

    'orders.activeTitle': 'Active orders',
    'orders.activeDesc': 'Only orders that need kitchen or pickup attention are shown here.',
    'orders.liveCount': '{count} live',
    'orders.waitingDriver': 'Waiting for driver',
    'orders.findingDriver': 'Finding an available courier…',
    'orders.driverAssigned': 'Courier found: {name}',
    'orders.pickupCode': 'Pickup code',
    'orders.accept': 'Accept',
    'orders.startPreparing': 'Start preparing',
    'orders.markReady': 'Mark ready',
    'orders.markPickedUp': 'Mark picked up',
    'orders.complete': 'Complete order',
    'orders.updating': 'Updating...',
    'orders.handedOff': 'Handed off',
    'orders.empty': 'No active orders right now.',
    'orders.emptyDesc': 'New customer orders will appear here automatically.',
    'orders.receivedAt': 'Received at {time}',
    'orders.noAddress': 'No delivery address',
    'orders.deliveryIncluded': 'Delivery included',

    'dashboard.title': 'Restaurant dashboard',
    'dashboard.desc': 'Previous orders, daily totals and menu health live here.',
    'dashboard.completedToday': 'Completed today',
    'dashboard.revenue': 'Revenue',
    'dashboard.averageTicket': 'Average ticket',
    'dashboard.previousOrders': 'Previous orders',
    'dashboard.notCompleted': 'Not completed',
    'dashboard.noPreviousOrders': 'No completed orders yet.',
    'stats.newOrders': 'New orders',
    'stats.preparing': 'Preparing',
    'stats.ready': 'Ready',
    'stats.activeItems': 'Active items',

    'calendar.title': 'Order calendar',
    'calendar.desc': 'Choose a day to open the order list for that date.',
    'calendar.previousMonth': 'Previous month',
    'calendar.nextMonth': 'Next month',
    'calendar.openDay': 'Open {date}',
    'calendar.orderCount': '{count} orders',
    'calendar.dayTitle': 'Orders for {date}',
    'calendar.dayDesc': 'Completed order list for the selected day.',
    'calendar.back': 'Back to calendar',
    'calendar.empty': 'No orders for this day.',

    'menu.productEditor': 'Product editor',
    'menu.newCategory': 'New category',
    'menu.productName': 'Product name',
    'menu.uncategorized': 'Uncategorized',
    'menu.price': 'Price',
    'menu.imageUrl': 'Image URL',
    'menu.description': 'Description',
    'menu.available': 'Available',
    'menu.saving': 'Saving...',
    'menu.updateProduct': 'Update product',
    'menu.createProduct': 'Create product',
    'menu.cancelEdit': 'Cancel edit',
    'menu.categoryPlaceholder': 'Pizza, grills, desserts...',
    'menu.shortDescription': 'Short description',
    'menu.createCategory': 'Create category',
    'menu.section': 'Menu section',
    'menu.itemsCount': '{count} items',
    'menu.noDescription': 'No description',
    'menu.hidden': 'Hidden from menu',
    'menu.edit': 'Edit',
    'menu.empty': 'No products here yet.',
    'status.passwordCreated': 'Password created. Sign in with the new password.',
    'status.categoryAdded': 'Category added.',
    'status.productUpdated': 'Product updated.',
    'status.productAdded': 'Product added.',
    'status.orderUpdated': 'Order status updated.',
    'status.sessionExpired': 'Session expired. Sign in again.',
    'error.loadRestaurant': 'Could not load restaurant.',
    'error.signIn': 'Could not sign in.',
    'error.setPassword': 'Could not set password.',
    'error.addCategory': 'Could not add category.',
    'error.saveProduct': 'Could not save product.',
    'error.updateOrder': 'Could not update order status.',
  },
  sr: {
    'common.english': 'Engleski',
    'common.serbian': 'Srpski',
    'common.refresh': 'Osveži',
    'common.logout': 'Odjavi se',
    'common.order': 'Porudžbina',
    'common.items': 'Stavke',
    'common.total': 'Ukupno',
    'common.status': 'Status',
    'common.date': 'Datum',

    'status.New': 'Nova',
    'status.Preparing': 'U pripremi',
    'status.Ready': 'Spremna',
    'status.Delivered': 'Dostavljena',
    'status.Cancelled': 'Otkazana',
    'status.pending': 'Nova',
    'status.accepted': 'Prihvaćena',
    'status.preparing': 'U pripremi',
    'status.ready': 'Spremna',
    'status.picked_up': 'Preuzeta',
    'status.delivered': 'Dostavljena',
    'status.cancelled': 'Otkazana',

    'nav.activeOrders': 'Aktivne porudžbine',
    'nav.dashboard': 'Pregled',
    'nav.calendar': 'Kalendar',
    'nav.menu': 'Meni',

    'restaurant.privateAccess': 'Privatni pristup konzoli',
    'restaurant.adminOnly': 'Samo nalozi koje izda admin',
    'restaurant.console': 'Restoran konzola',

    'auth.signIn': 'Prijava restorana',
    'auth.signInDesc': 'Otvori operativnu konzolu.',
    'auth.email': 'Email restorana',
    'auth.restaurantEmail': 'Email za Restaurant Console',
    'auth.password': 'Lozinka',
    'auth.opening': 'Otvaranje konzole...',
    'auth.openConsole': 'Otvori konzolu',
    'auth.setupCodeAccess': 'Pristup preko koda',
    'auth.firstAccess': 'Prvi pristup',
    'auth.resetPassword': 'Reset lozinke',
    'auth.firstAccessTitle': 'Prvi pristup restorana',
    'auth.firstAccessDesc': 'Iskoristi admin kod jednom, zatim napravi lozinku vlasnika.',
    'auth.passwordResetTitle': 'Reset lozinke',
    'auth.passwordResetDesc': 'Iskoristi novi kod od admina da zameniš staru lozinku.',
    'auth.setupCode': 'Kod od admina',
    'auth.createPassword': 'Napravi lozinku restorana',
    'auth.createNewPassword': 'Napravi novu lozinku',
    'auth.savingPassword': 'Čuvanje lozinke...',
    'auth.setNewPassword': 'Postavi novu lozinku',
    'auth.backToSignIn': 'Nazad na prijavu',

    'orders.activeTitle': 'Aktivne porudžbine',
    'orders.activeDesc': 'Ovde su samo porudžbine koje traže pažnju kuhinje ili preuzimanja.',
    'orders.liveCount': '{count} aktivno',
    'orders.waitingDriver': 'Čeka se dostavljač',
    'orders.findingDriver': 'Tražimo slobodnog dostavljača…',
    'orders.driverAssigned': 'Dostavljač je pronađen: {name}',
    'orders.pickupCode': 'Kod za preuzimanje',
    'orders.accept': 'Prihvati',
    'orders.startPreparing': 'Počni pripremu',
    'orders.markReady': 'Označi spremno',
    'orders.markPickedUp': 'Označi preuzeto',
    'orders.complete': 'Završi porudžbinu',
    'orders.updating': 'Ažuriranje...',
    'orders.handedOff': 'Predato',
    'orders.empty': 'Trenutno nema aktivnih porudžbina.',
    'orders.emptyDesc': 'Nove porudžbine korisnika će se ovde pojaviti automatski.',
    'orders.receivedAt': 'Primljeno u {time}',
    'orders.noAddress': 'Nema adrese za dostavu',
    'orders.deliveryIncluded': 'Dostava je uračunata',

    'dashboard.title': 'Pregled restorana',
    'dashboard.desc': 'Prethodne porudžbine, dnevni promet i stanje menija su ovde.',
    'dashboard.completedToday': 'Završeno danas',
    'dashboard.revenue': 'Promet',
    'dashboard.averageTicket': 'Prosečna porudžbina',
    'dashboard.previousOrders': 'Prethodne porudžbine',
    'dashboard.notCompleted': 'Nije završeno',
    'dashboard.noPreviousOrders': 'Još nema završenih porudžbina.',
    'stats.newOrders': 'Nove porudžbine',
    'stats.preparing': 'U pripremi',
    'stats.ready': 'Spremno',
    'stats.activeItems': 'Aktivne stavke',

    'calendar.title': 'Kalendar porudžbina',
    'calendar.desc': 'Izaberi dan da otvoriš listu porudžbina za taj datum.',
    'calendar.previousMonth': 'Prethodni mesec',
    'calendar.nextMonth': 'Sledeći mesec',
    'calendar.openDay': 'Otvori {date}',
    'calendar.orderCount': '{count} porudžbina',
    'calendar.dayTitle': 'Porudžbine za {date}',
    'calendar.dayDesc': 'Lista završenih porudžbina za izabrani dan.',
    'calendar.back': 'Nazad na kalendar',
    'calendar.empty': 'Nema porudžbina za ovaj dan.',

    'menu.productEditor': 'Uređivanje proizvoda',
    'menu.newCategory': 'Nova kategorija',
    'menu.productName': 'Naziv proizvoda',
    'menu.uncategorized': 'Bez kategorije',
    'menu.price': 'Cena',
    'menu.imageUrl': 'URL slike',
    'menu.description': 'Opis',
    'menu.available': 'Dostupno',
    'menu.saving': 'Čuvanje...',
    'menu.updateProduct': 'Ažuriraj proizvod',
    'menu.createProduct': 'Napravi proizvod',
    'menu.cancelEdit': 'Otkaži izmenu',
    'menu.categoryPlaceholder': 'Pizza, roštilj, dezerti...',
    'menu.shortDescription': 'Kratak opis',
    'menu.createCategory': 'Napravi kategoriju',
    'menu.section': 'Sekcija menija',
    'menu.itemsCount': '{count} stavki',
    'menu.noDescription': 'Nema opisa',
    'menu.hidden': 'Sakriveno iz menija',
    'menu.edit': 'Izmeni',
    'menu.empty': 'Još nema proizvoda ovde.',
    'status.passwordCreated': 'Lozinka je napravljena. Prijavi se novom lozinkom.',
    'status.categoryAdded': 'Kategorija je dodata.',
    'status.productUpdated': 'Proizvod je ažuriran.',
    'status.productAdded': 'Proizvod je dodat.',
    'status.orderUpdated': 'Status porudžbine je ažuriran.',
    'status.sessionExpired': 'Sesija je istekla. Prijavi se ponovo.',
    'error.loadRestaurant': 'Restoran nije mogao da se učita.',
    'error.signIn': 'Prijava nije uspela.',
    'error.setPassword': 'Lozinka nije mogla da se postavi.',
    'error.addCategory': 'Kategorija nije mogla da se doda.',
    'error.saveProduct': 'Proizvod nije mogao da se sačuva.',
    'error.updateOrder': 'Status porudžbine nije mogao da se ažurira.',
  },
}

type I18nContextValue = {
  language: Language
  locale: string
  setLanguage: (language: Language) => void
  t: (key: string, values?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function storedLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return value === 'sr' || value === 'en' ? value : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => storedLanguage())
  const locale = language === 'sr' ? 'sr-RS' : 'en-US'

  useEffect(() => {
    document.documentElement.lang = language === 'sr' ? 'sr-Latn-RS' : 'en'
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language])

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage)
  }, [])

  const t = useCallback(
    (key: string, values: Record<string, string | number> = {}) => {
      const template = dictionaries[language][key] || dictionaries.en[key] || key
      return Object.entries(values).reduce(
        (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
        template,
      )
    },
    [language],
  )

  const value = useMemo(
    () => ({ language, locale, setLanguage, t }),
    [language, locale, setLanguage, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider.')
  }

  return context
}

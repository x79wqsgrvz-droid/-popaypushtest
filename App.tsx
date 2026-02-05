/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useMemo, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Linking,
  Platform,
  PermissionsAndroid,
  Animated,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import QRCode from 'react-native-qrcode-svg';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  activate,
  activateByCode,
  getMyWallet,
  listFlashOffersNearby,
  getFlashOfferDetail,
  createReservation,
  holdDeposit,
  getReservation,
  cancelReservation,
  getMyTransactions,
  getMyRefunds,
  requestRefund,
  payPrepare,
  payConfirm,
  createFlashOffer,
  getMerchantReservations,
  payPrepareReservation,
  confirmReservationArrival,
  getMerchantDemand,
  updateMerchantDemandWindows,
  updateMerchantPlan,
  getMerchantNotifications,
  markMerchantNotificationRead,
  merchantRegister,
  merchantVerifyEmail,
  merchantLogin,
  merchantVerifyOtp,
  registerPushToken,
  getNotificationCounts,
  type FlashOfferListItem,
  type FlashOfferDetail,
  type Reservation,
  type WalletTx,
  type WalletRefund,
} from './src/api/client';

const DEMO_USER_ID = 1;
const DEMO_HOST_ID = 1;
const DEMO_CITY = 'Camerota';
const DEPOSIT_AMOUNT = 5;
const DEPOSIT_CURRENCY = 'EUR';

const THEME = {
  bg: '#F6F1E8',
  bgAlt: '#FFF9F1',
  ink: '#0F2A3D',
  inkSoft: '#355166',
  card: '#FFFFFF',
  coral: '#E76F51',
  coralDark: '#D45D43',
  sage: '#7FA89B',
  border: '#E8DED2',
};
const ACTIVITY_TYPES = [
  'Bar',
  'Caffetteria',
  'Pasticceria',
  'Gelateria',
  'Ristorante',
  'Pizzeria',
  'Trattoria',
  'Osteria',
  'Pub / Birreria',
  'Cocktail bar',
  'Wine bar / Enoteca',
  'Lido balneare',
  'Stabilimento termale / Spa',
  'Hotel / B&B',
  'Agriturismo',
  'Street food',
  'Fast food',
  'Negozio souvenir',
  'Negozio alimentari / Market',
  'Panificio / Forno',
  'Gastronomia',
  'Intrattenimento / Eventi',
];
const STRENGTHS_BY_ACTIVITY: Record<string, string[]> = {
  'Bar': ['Colazione', 'Caffè speciali', 'Cornetti e pasticceria', 'Aperitivo', 'Panini / snack', 'Gelato'],
  'Caffetteria': ['Colazione', 'Caffè speciali', 'Pasticceria fresca', 'Aperitivo', 'Snack'],
  'Pasticceria': ['Colazione', 'Torte artigianali', 'Semifreddi', 'Cioccolateria', 'Dolci da forno'],
  'Gelateria': ['Gelato artigianale', 'Semifreddi', 'Crêpes', 'Granite', 'Gusti speciali'],
  'Ristorante': ['Pranzo', 'Cena', 'Menu degustazione', 'Cucina tipica', 'Pesce'],
  'Pizzeria': ['Pizza classica', 'Pizza gourmet', 'Pizza al taglio', 'Fritti'],
  'Trattoria': ['Pranzo', 'Cena', 'Cucina tipica', 'Menu fisso'],
  'Osteria': ['Pranzo', 'Cena', 'Vini al calice', 'Taglieri'],
  'Pub / Birreria': ['Aperitivo', 'Birre artigianali', 'Panini / burger', 'Eventi sportivi'],
  'Cocktail bar': ['Aperitivo', 'Cocktail', 'Signature drink', 'After dinner'],
  'Wine bar / Enoteca': ['Vini al calice', 'Degustazioni', 'Taglieri', 'Aperitivo'],
  'Lido balneare': ['Colazione', 'Pranzo', 'Aperitivo', 'Noleggio ombrelloni', 'Eventi'],
  'Stabilimento termale / Spa': ['Relax', 'Trattamenti', 'Percorsi benessere', 'Day spa'],
  'Hotel / B&B': ['Colazione', 'Pranzo', 'Cena', 'Experience', 'Spa / benessere'],
  'Agriturismo': ['Colazione', 'Pranzo', 'Cena', 'Prodotti tipici', 'Degustazioni'],
  'Street food': ['Pranzo veloce', 'Cena veloce', 'Take away', 'Specialità locali'],
  'Fast food': ['Pranzo veloce', 'Cena veloce', 'Take away', 'Family menu'],
  'Negozio souvenir': ['Gadget locali', 'Artigianato', 'Prodotti tipici'],
  'Negozio alimentari / Market': ['Prodotti locali', 'Take away', 'Convenienza'],
  'Panificio / Forno': ['Pane fresco', 'Focacce', 'Pasticceria da forno', 'Snack'],
  'Gastronomia': ['Piatti pronti', 'Cucina tipica', 'Take away', 'Prodotti locali'],
  'Intrattenimento / Eventi': ['Live music', 'Spettacoli', 'Eventi speciali', 'Night life'],
};
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];
function mapActivityType(raw: string | null | undefined) {
  const v = String(raw || '').toLowerCase();
  if (!v) return null;
  if (v === 'ristorazione') return 'Ristorante';
  if (v === 'lido') return 'Lido balneare';
  if (v === 'intrattenimento') return 'Intrattenimento / Eventi';
  return raw as string;
}
type Role = 'client' | 'merchant' | 'host' | null;
type MerchantPlan = 'BASIC' | 'RECOMMENDED' | 'OFFERS';
const MERCHANT_DISCOUNT_PCT = 10;
const MERCHANT_FEE_BY_PLAN: Record<MerchantPlan, number> = {
  BASIC: 2,
  RECOMMENDED: 3,
  OFFERS: 4,
};
type MerchantTab = 'profile' | 'commercial' | 'payments' | 'offers' | 'reservations' | 'demand' | 'plan';
type TabKey = 'offers' | 'bookings' | 'wallet' | 'profile';
type BookingView = Reservation & {
  offerTitle?: string | null;
  merchantName?: string | null;
  merchantCity?: string | null;
};

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: THEME.bg,
  };
  const [role, setRole] = useState<Role>(null);
  const [merchantIdInput, setMerchantIdInput] = useState('2');
  const [merchantUserIdInput, setMerchantUserIdInput] = useState('1');
  const [merchantGrossInput, setMerchantGrossInput] = useState('0');
  const [merchantPlan, setMerchantPlan] = useState<MerchantPlan>('BASIC');
  const [merchantPlanDraft, setMerchantPlanDraft] = useState<MerchantPlan>('BASIC');
  const [merchantPlanSaving, setMerchantPlanSaving] = useState(false);
  const [merchantNotifications, setMerchantNotifications] = useState<any[]>([]);
  const [merchantNotificationsLoading, setMerchantNotificationsLoading] = useState(false);
  const [merchantNotificationsExpanded, setMerchantNotificationsExpanded] = useState(false);
  const [merchantNotificationsCount, setMerchantNotificationsCount] = useState(0);
  const [merchantNotificationOpenId, setMerchantNotificationOpenId] = useState<number | null>(null);
  const NOTIFICATIONS_TTL_DAYS = 7;
  const rolePromptOpacity = React.useRef(new Animated.Value(0)).current;
  const roleBtn1X = React.useRef(new Animated.Value(-40)).current;
  const roleBtn2X = React.useRef(new Animated.Value(-40)).current;
  const roleBtn3X = React.useRef(new Animated.Value(-40)).current;
  const roleBtn1Opacity = React.useRef(new Animated.Value(0)).current;
  const roleBtn2Opacity = React.useRef(new Animated.Value(0)).current;
  const roleBtn3Opacity = React.useRef(new Animated.Value(0)).current;
  const roleIntroPlayed = React.useRef(false);
  const [roleIntroReady, setRoleIntroReady] = useState(false);
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [merchantPrepare, setMerchantPrepare] = useState<any | null>(null);
  const [merchantQrVisible, setMerchantQrVisible] = useState(false);
  const [merchantTab, setMerchantTab] = useState<MerchantTab>('payments');
  const [merchantMenuVisible, setMerchantMenuVisible] = useState(false);
  const [merchantReservations, setMerchantReservations] = useState<any[]>([]);
  const [merchantReservationsLoading, setMerchantReservationsLoading] = useState(false);
  const [merchantReservationQuery, setMerchantReservationQuery] = useState('');
  const [merchantDemand, setMerchantDemand] = useState<any | null>(null);
  const [merchantDemandLoading, setMerchantDemandLoading] = useState(false);
  const [lastDemandLevel, setLastDemandLevel] = useState<string | null>(null);
  const [demandActivityType, setDemandActivityType] = useState('ristorazione');
  const [window1Label, setWindow1Label] = useState('Colazione');
  const [window1Start, setWindow1Start] = useState('07:00');
  const [window1End, setWindow1End] = useState('10:30');
  const [window2Label, setWindow2Label] = useState('Pranzo');
  const [window2Start, setWindow2Start] = useState('12:00');
  const [window2End, setWindow2End] = useState('15:00');
  const [window3Label, setWindow3Label] = useState('Cena');
  const [window3Start, setWindow3Start] = useState('19:00');
  const [window3End, setWindow3End] = useState('22:30');
  const [commercialActivityType, setCommercialActivityType] = useState<string | null>(null);
  const [commercialWindows, setCommercialWindows] = useState<{ label: string; start: string; end: string }[]>([]);
  const [commercialExpanded, setCommercialExpanded] = useState(false);
  const [commercialLoading, setCommercialLoading] = useState(false);
  const [showActivityOptions, setShowActivityOptions] = useState(false);
  const [showStrengthOptions, setShowStrengthOptions] = useState(false);
  const [openTimeMenu, setOpenTimeMenu] = useState<{ label: string; field: 'start' | 'end'; part: 'hour' | 'minute' } | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerPriceInput, setOfferPriceInput] = useState('');
  const [offerStandardPriceInput, setOfferStandardPriceInput] = useState('');
  const [offerMealType, setOfferMealType] = useState('Cena');
  const [offerCity, setOfferCity] = useState(DEMO_CITY);
  const [merchantAuthed, setMerchantAuthed] = useState(false);
  const [merchantAuthStep, setMerchantAuthStep] = useState<'login' | 'otp' | 'register' | 'verifyEmail'>('login');
  const [merchantAuthEmail, setMerchantAuthEmail] = useState('');
  const [merchantAuthPassword, setMerchantAuthPassword] = useState('');
  const [merchantAuthCode, setMerchantAuthCode] = useState('');
  const [merchantAuthLoading, setMerchantAuthLoading] = useState(false);
  const [registerLegalName, setRegisterLegalName] = useState('');
  const [registerBusinessName, setRegisterBusinessName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerVatNumber, setRegisterVatNumber] = useState('');
  const [registerAddress, setRegisterAddress] = useState('');
  const [registerCity, setRegisterCity] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const now = roundTo5(new Date());
  const [offerStartDate, setOfferStartDate] = useState(now.toISOString().slice(0,10));
  const [offerStartTime, setOfferStartTime] = useState(now.toTimeString().slice(0,5));
  const [offerEndDate, setOfferEndDate] = useState(now.toISOString().slice(0,10));
  const [offerEndTime, setOfferEndTime] = useState(new Date(now.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0,5));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [offerQtyInput, setOfferQtyInput] = useState('20');
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerResult, setOfferResult] = useState<any | null>(null);
  const [offerErrors, setOfferErrors] = useState<{ title?: string; price?: string; standardPrice?: string; qty?: string; time?: string; merchantId?: string }>({});
  const errorInput = (key: 'title' | 'price' | 'standardPrice' | 'qty' | 'time' | 'merchantId') =>
    offerErrors[key] ? styles.inputError : null;
  const [scanVisible, setScanVisible] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('offers');;
  const [token, setToken] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<number>(DEMO_USER_ID);
  const [authHostId, setAuthHostId] = useState<number>(DEMO_HOST_ID);
  const [wallet, setWallet] = useState<any | null>(null);
  const [offers, setOffers] = useState<FlashOfferListItem[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<FlashOfferDetail | null>(null);
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [accessCode, setAccessCode] = useState<string>('');
  const [partySize, setPartySize] = useState<number>(2);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [refunds, setRefunds] = useState<WalletRefund[]>([]);
  const [notifCounts, setNotifCounts] = useState<{ offers: number; bookings: number }>({ offers: 0, bookings: 0 });
  const [lastPaidShownId, setLastPaidShownId] = useState<number | null>(null);
  const depositForParty = (size: number) => {
    if (size >= 10) return 20;
    if (size >= 7) return 15;
    if (size >= 4) return 10;
    return 5;
  };

  const merchantSummary = useMemo(() => {
    const gross = Number(merchantGrossInput.replace(',', '.'));
    if (!Number.isFinite(gross) || gross <= 0) {
      return { gross: 0, discount: 0, net: 0, feePct: MERCHANT_FEE_BY_PLAN[merchantPlan], fee: 0, merchantNet: 0 };
    }
    const discount = (gross * MERCHANT_DISCOUNT_PCT) / 100;
    const net = gross - discount;
    const feePct = MERCHANT_FEE_BY_PLAN[merchantPlan];
    const fee = (net * feePct) / 100;
    const merchantNet = net - fee;
    return { gross, discount, net, feePct, fee, merchantNet };
  }, [merchantGrossInput, merchantPlan]);

  async function loadMerchantReservations() {
    const merchantId = Number(merchantIdInput);
    if (!Number.isFinite(merchantId)) return;
    setMerchantReservationsLoading(true);
    try {
      const res = await getMerchantReservations(merchantId);
      setMerchantReservations(res.items);
    } catch (e) {
      console.warn('[merchant] reservations error', e);
    } finally {
      setMerchantReservationsLoading(false);
    }
  }

  async function loadMerchantDemand() {
    const merchantId = Number(merchantIdInput);
    if (!Number.isFinite(merchantId)) return;
    setMerchantDemandLoading(true);
    try {
      const res = await getMerchantDemand(merchantId);
      setMerchantDemand(res);
      setDemandActivityType(res.activityType || 'ristorazione');
      if (!commercialActivityType) {
        setCommercialActivityType(mapActivityType(res.activityType));
      }
      if (!commercialWindows.length && res.windows?.length) {
        setCommercialWindows(res.windows.map((w: any) => ({
          label: w.label,
          start: w.start,
          end: w.end,
        })));
      }
      if (res.windows?.[0]) {
        setWindow1Label(res.windows[0].label);
        setWindow1Start(res.windows[0].start);
        setWindow1End(res.windows[0].end);
      }
      if (res.windows?.[1]) {
        setWindow2Label(res.windows[1].label);
        setWindow2Start(res.windows[1].start);
        setWindow2End(res.windows[1].end);
      }
      if (res.windows?.[2]) {
        setWindow3Label(res.windows[2].label);
        setWindow3Start(res.windows[2].start);
        setWindow3End(res.windows[2].end);
      }
    } catch (e) {
      console.warn('[merchant] demand error', e);
    } finally {
      setMerchantDemandLoading(false);
    }
  }

  function demandLevelFromPercent(pct: number) {
    if (pct >= 70) return 'HIGH';
    if (pct >= 40) return 'MEDIUM';
    return 'LOW';
  }

  useEffect(() => {
    if (role !== 'merchant' || !merchantDemand?.windows?.length) return;
    const top = merchantDemand.windows.reduce((a: any, b: any) => (b.demandPercent > a.demandPercent ? b : a));
    const level = demandLevelFromPercent(top.demandPercent);
    if (level === 'HIGH' && lastDemandLevel !== 'HIGH') {
      Alert.alert('Domanda alta', `È il momento giusto per lanciare un’offerta: ${top.label} (${top.demandPercent}%)`);
    }
    setLastDemandLevel(level);
  }, [merchantDemand, role]);

  useEffect(() => {
    if (role !== 'merchant' || merchantTab !== 'plan') return;
    setMerchantPlanDraft(merchantPlan);
  }, [role, merchantTab, merchantPlan]);

  const device = useCameraDevice('back');
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: async (codes) => {
      if (scanBusy) return;
      const code = codes[0]?.value;
      if (!code) return;
      setScanBusy(true);
      try {
        const data = JSON.parse(code);
        const transactionId = Number(data.transactionId);
        if (!Number.isFinite(transactionId)) throw new Error('QR non valido');
        const authToken = await ensureToken();
        const w = await ensureWallet();
        const res = await payConfirm({ userId: authUserId, token: authToken, transactionId, walletId: w.id });
        Alert.alert('Pagamento effettuato', `Pagato: € ${fmtMoney(res.transaction.net_amount)}`);
        await loadWallet();
        setScanVisible(false);
      } catch (e: any) {
        Alert.alert('Errore', e?.message || 'QR non valido');
      } finally {
        setScanBusy(false);
      }
    },
  });

  async function openScanner() {
    const current = await Camera.getCameraPermissionStatus();
    console.log('[scanner] permission', current);
    if (current === 'authorized' || current === 'granted') {
      setScanVisible(true);
      return;
    }
    const status = await Camera.requestCameraPermission();
    console.log('[scanner] permission after request', status);
    if (status !== 'authorized' && status !== 'granted') {
      Alert.alert(
        'Permesso',
        'Serve accesso alla fotocamera',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Apri impostazioni', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    setScanVisible(true);
  }

  async function openOfferById(offerId: number) {
    setLoading(true);
    try {
      const detail = await getFlashOfferDetail(offerId);
      setSelectedOffer(detail);
      setActiveTab('offers');
    } catch (e: any) {
      Alert.alert('Errore', e?.body?.error || e?.message || 'Errore apertura offerta');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (role !== 'client') return;
    // Auto-load iniziale per demo
    loadOffers();
    loadWallet();
  }, [role]);

  useEffect(() => {
    if (role !== 'merchant') return;
    if (merchantTab === 'reservations') loadMerchantReservations();
  }, [role, merchantTab]);

  useEffect(() => {
    if (role !== 'merchant') return;
    if (merchantTab !== 'demand') return;
    loadMerchantDemand();
    const t = setInterval(() => loadMerchantDemand(), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [role, merchantTab]);

  useEffect(() => {
    if (role !== 'merchant') return;
    if (merchantTab !== 'commercial') return;
    loadMerchantDemand();
  }, [role, merchantTab]);

  useEffect(() => {
    let cancelled = false;
    async function initIntro() {
      if (role !== null) return;
      if (roleIntroPlayed.current) return;
      const seen = await AsyncStorage.getItem('popay_welcome_seen');
      if (seen) return;
      if (cancelled) return;
      roleIntroPlayed.current = true;
      setRoleIntroReady(true);
      await AsyncStorage.setItem('popay_welcome_seen', '1');
      rolePromptOpacity.setValue(0);
      roleBtn1X.setValue(-40);
      roleBtn2X.setValue(-40);
      roleBtn3X.setValue(-40);
      roleBtn1Opacity.setValue(0);
      roleBtn2Opacity.setValue(0);
      roleBtn3Opacity.setValue(0);
      Animated.sequence([
        Animated.timing(rolePromptOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.stagger(180, [
          Animated.parallel([
            Animated.timing(roleBtn1X, { toValue: 0, duration: 450, useNativeDriver: true }),
            Animated.timing(roleBtn1Opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(roleBtn2X, { toValue: 0, duration: 450, useNativeDriver: true }),
            Animated.timing(roleBtn2Opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(roleBtn3X, { toValue: 0, duration: 450, useNativeDriver: true }),
            Animated.timing(roleBtn3Opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    }
    initIntro();
    return () => { cancelled = true; };
  }, [role]);

  useEffect(() => {
    if (role !== 'merchant') return;
    if (merchantTab !== 'profile') return;
    loadMerchantNotifications();
  }, [role, merchantTab]);

  async function loadMerchantNotifications() {
    const merchantId = Number(merchantIdInput);
    if (!Number.isFinite(merchantId)) return;
    setMerchantNotificationsLoading(true);
    try {
      const res = await getMerchantNotifications(merchantId);
      const cutoff = Date.now() - NOTIFICATIONS_TTL_DAYS * 24 * 60 * 60 * 1000;
      const items = (res.items || []).filter((n: any) => {
        const ts = new Date(n.created_at).getTime();
        return Number.isFinite(ts) && ts >= cutoff;
      });
      setMerchantNotifications(items);
      const nextUnread = Math.max(0, Number(res.unreadCount ?? items.length));
      if (nextUnread > merchantNotificationsCount) {
        setMerchantNotificationsExpanded(true);
      }
      setMerchantNotificationsCount(nextUnread);
    } catch (e) {
      console.warn('[merchant] notifications error', e);
    } finally {
      setMerchantNotificationsLoading(false);
    }
  }

  useEffect(() => {
    if (role !== 'merchant' || merchantTab !== 'reservations') return;
    const t = setInterval(() => setFlashOn((v) => !v), 600);
    return () => clearInterval(t);
  }, [role, merchantTab]);

  useEffect(() => {
    if (role !== 'client') return;
    loadNotificationCounts();
  }, [role]);

  useEffect(() => {
    if (role !== 'client') return;
    if (activeTab === 'wallet') {
      loadWallet();
    }
    if (activeTab === 'offers') {
      loadOffers();
    }
    if (activeTab === 'offers' || activeTab === 'bookings') {
      loadNotificationCounts();
    }
  }, [activeTab, role]);

  useEffect(() => {
    if (role !== 'client') return;
    async function initPush() {
      try {
        console.log('[push] init start', { authUserId, token });
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }
        await messaging().setAutoInitEnabled(true);
        await messaging().registerDeviceForRemoteMessages();
        const isRegistered = await messaging().isDeviceRegisteredForRemoteMessages;
        console.log('[push] device registered', isRegistered);
        try {
          await messaging().requestPermission();
        } catch (e) {
          // requestPermission not required on Android, ignore
        }
        const authToken = await ensureToken();
        const fcmToken = await Promise.race([
          messaging().getToken(),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('FCM getToken timeout')), 7000)
          ),
        ]);
        console.log('[push] fcmToken', fcmToken);
        if (fcmToken) {
          await registerPushToken(authUserId, authToken, fcmToken);
          console.log('[push] token registered');
        }
      } catch (err) {
        console.log('[push] init error', err);
      }
    }
    initPush();
    const unsub = messaging().onTokenRefresh(async (fcmToken) => {
      console.log('[push] token refresh', fcmToken);
      try {
        const authToken = await ensureToken();
        await registerPushToken(authUserId, authToken, fcmToken);
        console.log('[push] token refresh registered');
      } catch (e) {
        console.log('[push] token refresh error', e);
      }
    });
    return () => unsub();
  }, [authUserId, token, role]);

  async function ensureToken() {
    if (token) return token;
    const activation = await activate(authUserId, authHostId);
    setToken(activation.token);
    return activation.token;
  }

  async function ensureWallet() {
    if (wallet) return wallet;
    const authToken = await ensureToken();
    const me = await getMyWallet(authUserId, authToken);
    setWallet(me.wallet);
    return me.wallet;
  }

  async function refreshWallet() {
    const authToken = await ensureToken();
    const me = await getMyWallet(authUserId, authToken);
    setWallet(me.wallet);
    return me.wallet;
  }

  async function loadNotificationCounts() {
    try {
      const authToken = await ensureToken();
      const counts = await getNotificationCounts(authUserId, authToken);
      setNotifCounts(counts);
    } catch (err) {
      console.log('[notifications] counts error', err);
    }
  }

  async function refreshBookings() {
    const ids = bookings.map((b) => b.id);
    if (ids.length === 0) return;
    const metaById = new Map(
      bookings.map((b) => [
        b.id,
        {
          offerTitle: b.offerTitle ?? null,
          merchantName: b.merchantName ?? null,
          merchantCity: b.merchantCity ?? null,
        },
      ])
    );
    const results = await Promise.all(
      ids.map((id) =>
        getReservation(id)
          .then((r) => r.reservation)
          .catch(() => null)
      )
    );
    const merged = results
      .filter(Boolean)
      .map((r) => ({ ...(r as Reservation), ...(metaById.get(r!.id) || {}) })) as BookingView[];
    setBookings(merged);
  }

  async function loadReservations() {
    await refreshBookings();
  }

  async function loadOffers() {
    setLoading(true);
    setStatus('');
    try {
      const res = await listFlashOffersNearby(DEMO_CITY);
      setOffers(res.items);
      setSelectedOffer(null);
      if (res.items.length === 0) {
        setStatus('Nessuna offerta disponibile');
      }
    } catch (err) {
      setOffers([]);
      setStatus('Nessuna offerta disponibile');
    } finally {
      setLoading(false);
    }
  }

  async function openOffer(id: number) {
    setLoading(true);
    setStatus('');
    try {
      const detail = await getFlashOfferDetail(id);
      setSelectedOffer(detail);
    } catch (err) {
      setStatus(JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }

  async function bookOffer(offer: FlashOfferDetail | FlashOfferListItem) {
    setLoading(true);
    setStatus('');
    try {
      const w = await ensureWallet();
      const depositAmount = depositForParty(partySize);
      const created = await createReservation({
        userId: authUserId,
        businessId: offer.merchantId,
        flashOfferId: offer.id,
        depositAmount,
        partySize,
      });
      const merchantName =
        'merchant' in offer ? offer.merchant?.name ?? null : null;
      const merchantCity =
        'merchant' in offer ? offer.merchant?.city ?? null : null;
      await holdDeposit({
        reservationId: created.id,
        walletId: w.id,
        amount: depositAmount,
        currency: DEPOSIT_CURRENCY,
      });
      Alert.alert(
        'Prenotazione confermata',
        `Prenotazione #${created.id} con garanzia €${DEPOSIT_AMOUNT}`
      );
      setBookings((prev) => [
        {
          ...(created as Reservation),
          offerTitle: offer.title,
          merchantName,
          merchantCity,
        },
        ...prev,
      ]);
      setActiveTab('bookings');
    } catch (err) {
      setStatus(JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(reservationId: number, withRefund: boolean) {
    setLoading(true);
    setStatus('');
    try {
      const result = await cancelReservation(reservationId);
      const policyLabel = result.policy === 'REFUND' ? 'Rimborsabile' : 'Non rimborsabile';
      Alert.alert('Cancellazione', `${policyLabel} (cutoff ${result.cutoffMinutes} min)`);
      await loadReservations();
      await loadWallet();
    } catch (err) {
      const msg = typeof err === 'string' ? err : JSON.stringify(err);
      setStatus(msg);
      Alert.alert('Errore', msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadWallet() {
    setLoading(true);
    setStatus('');
    try {
      const w = await refreshWallet();
      console.log('[wallet] load', { authUserId, hasToken: !!token });
      const authToken = await ensureToken();
      console.log('[wallet] token', authToken.slice(0, 8));
      const tx = await getMyTransactions(authUserId, authToken, 20);
      console.log('[wallet] transactions', tx.items);
      setTransactions(tx.items);
      const rf = await getMyRefunds(authUserId, authToken, w?.id);
      setRefunds(rf);
    } catch (err) {
      const msg =
        typeof err === 'string'
          ? err
          : (err as any)?.body?.error || (err as any)?.message || JSON.stringify(err);
      setStatus(msg);
      Alert.alert('Errore wallet', msg);
    } finally {
      setLoading(false);
    }
  }

  function renderOffersTab() {
    return (
      <ScrollView
        contentContainerStyle={styles.tabContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOffers} />}
      >
        <Text style={styles.title}>Offerte</Text>
        <Text style={styles.subtitle}>Città: {DEMO_CITY}</Text>
        {loading ? <ActivityIndicator /> : null}
        {status ? <Text style={styles.errorText}>{status}</Text> : null}
        {offers.map((o, idx) => (
          <TouchableOpacity key={o.id} style={styles.offerCard} onPress={() => openOffer(o.id)}>
            <View style={styles.offerAccent} />
            <View style={styles.offerHeader}>
              <Text style={styles.offerTitle}>{o.title}</Text>
              <View style={styles.pricePill}>
                <Text style={styles.pricePillText}>€ {fmtMoney(o.price)}</Text>
              </View>
            </View>
            {o.standardPrice ? (
              <View style={styles.savingsPill}>
                <Text style={styles.savingsPillText}>
                  Risparmi € {fmtMoney(Number(o.standardPrice) - Number(o.price))}
                </Text>
              </View>
            ) : null}
            <View style={styles.offerMetaRow}>
              <Text style={styles.offerMetaLabel}>Inizio</Text>
              <Text style={styles.offerMetaValue}>
                {new Date(o.startsAt).toLocaleString()}
              </Text>
            </View>
            {idx === 0 ? <Text style={styles.offerBadge}>Offerta in evidenza</Text> : null}
          </TouchableOpacity>
        ))}
        {selectedOffer ? (
          <View style={styles.detailCard}>
            <Text style={styles.cardTitle}>{selectedOffer.title}</Text>
            <Text style={styles.cardMeta}>{selectedOffer.description || '—'}</Text>
            <Text style={styles.cardMeta}>€ {fmtMoney(selectedOffer.price)}</Text>
            {selectedOffer.standardPrice ? (
              <Text style={styles.cardMeta}>
                Prezzo standard € {fmtMoney(selectedOffer.standardPrice)}
              </Text>
            ) : null}
            <View style={styles.partyRow}>
              <Text style={styles.cardMeta}>Persone</Text>
              <View style={styles.partyControls}>
                <TouchableOpacity
                  style={styles.partyBtn}
                  onPress={() => setPartySize((p) => Math.max(1, p - 1))}>
                  <Text style={styles.partyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.partyValue}>{partySize}</Text>
                <TouchableOpacity
                  style={styles.partyBtn}
                  onPress={() => setPartySize((p) => p + 1)}>
                  <Text style={styles.partyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => bookOffer(selectedOffer)}>
              <Text style={styles.primaryBtnText}>
                Prenota + garanzia €{fmtMoney(depositForParty(partySize))}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    );
  }

  function renderBookingsTab() {
    const statusLabel = (s?: string | null) => {
      switch (s) {
        case 'held':
          return 'Attiva';
        case 'released':
          return 'Cancellata (rimborsata)';
        case 'forfeited':
          return 'Cancellata (senza rimborso)';
        default:
          return '—';
      }
    };
    const openMaps = (name?: string | null, city?: string | null) => {
      const q = [name, city].filter(Boolean).join(' ');
      if (!q) {
        Alert.alert('Indicazioni', 'Dati esercente non disponibili.');
        return;
      }
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Indicazioni', 'Impossibile aprire Google Maps.');
      });
    };
    return (
      <ScrollView contentContainerStyle={styles.tabContent}>
        <Text style={styles.title}>Prenotazioni</Text>
        {bookings.length === 0 ? <Text style={styles.subtitle}>Nessuna prenotazione ancora.</Text> : null}
        {status ? <Text style={styles.errorText}>{status}</Text> : null}
        {bookings.map((b) => (
          <View key={b.id} style={styles.card}>
            <Text style={styles.cardTitle}>Booking #{b.id}</Text>
            {b.offerTitle ? <Text style={styles.cardMeta}>{b.offerTitle}</Text> : null}
            {b.merchantName ? (
              <Text style={styles.cardMeta}>
                {b.merchantName}{b.merchantCity ? ` • ${b.merchantCity}` : ''}
              </Text>
            ) : null}
            {b.party_size ? <Text style={styles.cardMeta}>Persone: {b.party_size}</Text> : null}
            <Text style={styles.cardMeta}>Stato: {statusLabel(b.deposit_status)}</Text>
            <TouchableOpacity
              style={[styles.secondaryBtn, (b.deposit_status === 'released' || b.deposit_status === 'forfeited') ? styles.btnDisabled : null]}
              onPress={() => cancelBooking(b.id, true)}
              disabled={b.deposit_status === 'released' || b.deposit_status === 'forfeited'}>
              <Text style={styles.secondaryBtnText}>Cancella</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => openMaps(b.merchantName, b.merchantCity)}>
              <Text style={styles.ghostBtnText}>Indicazioni</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    );
  }

  function renderWalletTab() {
    const formatDayLabel = (iso: string) => {
      const d = new Date(iso);
      const weekday = d.toLocaleDateString('it-IT', { weekday: 'short' });
      const date = d.toLocaleDateString('it-IT');
      return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date}`;
    };
    const totalSavings = transactions.reduce((sum, t) => {
      if (t.is_reservation && t.offer?.standardPrice && t.offer?.price && t.gross_amount != null) {
        const unitStd = Number(t.offer.standardPrice);
        const unitOffer = Number(t.offer.price);
        if (Number.isFinite(unitStd) && Number.isFinite(unitOffer) && unitStd > unitOffer && unitOffer > 0) {
          const partySize = t.gross_amount / unitOffer;
          return sum + Math.max(0, (unitStd - unitOffer) * partySize);
        }
      }
      return sum + (t.savings ?? 0);
    }, 0);
    const labelForTx = (t: WalletTx) => {
      switch (t.description) {
        case 'deposit_hold':
          return 'Cauzione prenotazione';
        case 'deposit_release':
          return 'Deposito riaccreditato';
        case 'deposit_forfeit':
          return 'Cauzione utilizzata';
        case 'paid':
          return t.is_reservation ? 'Saldo evento' : 'Pagamento';
        case 'prepared':
          return 'Pagamento in attesa';
        default:
          return t.description || 'Transazione';
      }
    };
    const grouped = (() => {
      const map = new Map<string, { label: string; items: WalletTx[] }>();
      const visible = transactions.filter((t) => t.description !== 'prepared');
      const sorted = [...visible].sort(
        (a, b) => new Date(b.when).getTime() - new Date(a.when).getTime()
      );
      for (const t of sorted) {
        const key = new Date(t.when).toLocaleDateString('it-IT');
        if (!map.has(key)) {
          map.set(key, { label: formatDayLabel(t.when), items: [] });
        }
        map.get(key)!.items.push(t);
      }
      return Array.from(map.values());
    })();
    return (
      <View style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.tabContent}>
          <Text style={styles.title}>Wallet</Text>
          {wallet ? (
            <View style={styles.walletCard}>
              <Text style={styles.walletBalance}>€ {fmtMoney(wallet.remaining_credit)}</Text>
              <Text style={styles.walletMeta}>Taglio: € {fmtMoney(wallet.initial_credit)}</Text>
              <Text style={styles.walletMeta}>Stato: {wallet.status}</Text>
              <Text style={styles.walletMeta}>
                Scadenza: {wallet.expires_at ? new Date(wallet.expires_at).toLocaleDateString() : '—'}
              </Text>
            </View>
          ) : (
            <Text style={styles.subtitle}>Nessun wallet caricato.</Text>
          )}
          <View style={styles.savingsCard}>
            <Text style={styles.savingsLabel}>Risparmio totale</Text>
            <Text style={styles.savingsValue}>€ {fmtMoney(totalSavings)}</Text>
          </View>
          <Text style={styles.subtitle}>Transazioni</Text>
          {grouped.length === 0 ? (
            <Text style={styles.subtitle}>Nessuna transazione.</Text>
          ) : (
          grouped.map((group) => (
            <View key={group.label} style={styles.dayCard}>
              <Text style={styles.dayHeader}>{group.label}</Text>
              {group.items.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.txRowWrap,
                    t.description === 'paid' && t.is_reservation ? styles.txRowHighlight : null,
                  ]}
                  onPress={() => {
                    if (t.offer?.id) {
                      openOfferById(t.offer.id);
                      return;
                    }
                    const gross = t.gross_amount;
                    const net = t.net_amount ?? Number(t.net_spent);
                    const savings = t.is_reservation ? 0 : (t.savings ?? (gross != null && net != null ? gross - net : null));
                    if (gross != null && net != null) {
                      const depositApplied = t.is_reservation ? Math.max(0, gross - net) : 0;
                      Alert.alert(
                        'Dettaglio pagamento',
                        t.is_reservation
                          ? `Prezzo evento: € ${fmtMoney(gross)}\nCauzione: € ${fmtMoney(depositApplied)}\nSaldo pagato: € ${fmtMoney(net)}`
                          : `Prezzo di listino: € ${fmtMoney(gross)}\nSconto PoPay: € ${fmtMoney(savings)}\nPagato: € ${fmtMoney(net)}`
                      );
                    }
                  }}>
                  <View style={styles.txRow}>
                    <Text style={[styles.txLabel, t.description === 'paid' && t.is_reservation ? styles.txLabelBold : null]}>
                      {labelForTx(t)}
                    </Text>
                    <Text style={styles.txAmount}>€ {fmtMoney(t.net_amount ?? t.net_spent)}</Text>
                  </View>
                  {t.merchant?.name ? (
                    <Text style={styles.txMerchant}>{t.merchant.name}</Text>
                  ) : null}
                  {t.is_reservation && t.offer ? (
                    <Text style={styles.txMeta}>
                      Evento: {t.offer.title} • Prezzo € {fmtMoney(t.offer.price)} • Cauzione € {fmtMoney(
                        t.gross_amount != null && t.net_amount != null
                          ? t.gross_amount - t.net_amount
                          : Number(t.net_spent)
                      )}
                      {t.offer.standardPrice ? ` • Risparmio € ${fmtMoney((Number(t.offer.standardPrice) - Number(t.offer.price)) * (t.gross_amount && Number(t.offer.price) ? t.gross_amount / Number(t.offer.price) : 1))}` : ''}
                    </Text>
                  ) : null}
                  {t.gross_amount != null && t.net_amount != null && !t.is_reservation ? (
                    <Text style={styles.txMeta}>
                      Listino € {fmtMoney(t.gross_amount)} • Sconto € {fmtMoney(t.savings ?? (t.gross_amount - t.net_amount))}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
          {status ? <Text style={styles.errorText}>{status}</Text> : null}
        </ScrollView>
        <View style={styles.payBar}>
          <TouchableOpacity
            style={styles.payBtn}
            onPress={openScanner}>
            <Text style={styles.payBtnText}>Paga conto • Inquadra QR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderProfileTab() {
    const totalSavings = transactions.reduce((sum, t) => sum + (t.savings ?? 0), 0);
    const taglioDate = wallet?.activated_at || wallet?.created_at;
    const hostAddress = [wallet?.hosts?.address, wallet?.hosts?.city, wallet?.hosts?.country]
      .filter(Boolean)
      .join(', ');
    const checkoutDate = wallet?.users?.checkout_date ? new Date(wallet.users.checkout_date) : null;
    const isCheckoutToday = checkoutDate
      ? new Date().toDateString() === checkoutDate.toDateString()
      : false;
    const refundAvailableFrom = checkoutDate
      ? new Date(checkoutDate.getFullYear(), checkoutDate.getMonth(), checkoutDate.getDate() + 1)
      : null;
    const refundAllowed =
      !!wallet &&
      wallet.status === 'ACTIVE' &&
      Number(wallet.remaining_credit) > 0 &&
      (!!refundAvailableFrom && new Date() >= refundAvailableFrom);
    const hasPendingRefund = refunds.some((r) => r.status === 'REQUESTED' || r.status === 'PROCESSING');
    const openHostMaps = () => {
      const q = [wallet?.hosts?.name, hostAddress].filter(Boolean).join(' ');
      if (!q) {
        Alert.alert('Indicazioni', 'Dati host non disponibili.');
        return;
      }
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Indicazioni', 'Impossibile aprire Google Maps.');
      });
    };
    return (
      <ScrollView contentContainerStyle={styles.tabContent}>
        <Text style={styles.title}>Profilo</Text>
        <Text style={styles.subtitle}>userId={authUserId} • hostId={authHostId}</Text>
        <Text style={styles.subtitle}>Token: {token ? `${token.slice(0, 8)}…` : 'non attivo'}</Text>
        <View style={[styles.savingsCard, isCheckoutToday ? styles.savingsHighlight : null]}>
          <Text style={styles.savingsLabel}>Risparmio totale ad oggi</Text>
          <Text style={styles.savingsValue}>€ {fmtMoney(totalSavings)}</Text>
          {checkoutDate ? (
            <Text style={styles.cardMeta}>Aggiornato al {new Date().toLocaleDateString()}</Text>
          ) : null}
        </View>
        <Text style={styles.subtitle}>Tagli acquistati</Text>
        {wallet ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>€ {fmtMoney(wallet.initial_credit)}</Text>
            <Text style={styles.cardMeta}>
              Host: {wallet.hosts?.name || '—'}
            </Text>
            {hostAddress ? <Text style={styles.cardMeta}>Indirizzo: {hostAddress}</Text> : null}
            <Text style={styles.cardMeta}>
              Data: {taglioDate ? new Date(taglioDate).toLocaleDateString() : '—'}
            </Text>
            <TouchableOpacity style={styles.ghostBtn} onPress={openHostMaps}>
              <Text style={styles.ghostBtnText}>Torna al tuo host</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.subtitle}>Nessun taglio disponibile.</Text>
        )}
        <Text style={styles.subtitle}>Rimborsi effettuati</Text>
        {refunds.length === 0 ? (
          <Text style={styles.subtitle}>Nessun rimborso effettuato.</Text>
        ) : (
          refunds.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.cardTitle}>Rimborso #{r.id}</Text>
              <Text style={styles.cardMeta}>Tipo: {r.type} • Stato: {r.status}</Text>
              <Text style={styles.cardMeta}>Importo: € {fmtMoney(r.amount)}</Text>
              <Text style={styles.cardMeta}>
                Data: {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
              </Text>
            </View>
          ))
        )}
        <Text style={styles.subtitle}>Rimborso saldo residuo</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, (!refundAllowed || hasPendingRefund) ? styles.btnDisabled : null]}
          onPress={async () => {
            if (!refundAllowed || hasPendingRefund || !token) return;
            setLoading(true);
            setStatus('');
            try {
              await requestRefund(authUserId, token);
              await loadWallet();
              Alert.alert('Richiesta inviata', 'Il rimborso è stato richiesto.');
            } catch (err) {
              const msg =
                typeof err === 'string'
                  ? err
                  : (err as any)?.body?.error || (err as any)?.message || JSON.stringify(err);
              setStatus(msg);
              Alert.alert('Errore rimborso', msg);
            } finally {
              setLoading(false);
            }
          }}
          disabled={!refundAllowed || hasPendingRefund}>
          <Text style={styles.primaryBtnText}>Richiedi rimborso</Text>
        </TouchableOpacity>
        {hasPendingRefund ? (
          <Text style={styles.subtitle}>Hai già una richiesta in lavorazione.</Text>
        ) : null}
        {!refundAllowed && refundAvailableFrom ? (
          <Text style={styles.subtitle}>
            Disponibile dal {refundAvailableFrom.toLocaleDateString()}
          </Text>
        ) : null}
        <Text style={styles.subtitle}>Inquadra il QR e attiva il tuo wallet</Text>
        <TextInput
          value={accessCode}
          onChangeText={setAccessCode}
          placeholder="Inserisci codice QR"
          autoCapitalize="characters"
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={async () => {
            setLoading(true);
            setStatus('');
            try {
              const res = await activateByCode(accessCode.trim());
              setToken(res.token);
              setAuthUserId(res.userId);
              setAuthHostId(res.hostId);
              setWallet(null);
              setBookings([]);
              Alert.alert('Attivazione riuscita', `Token: ${res.token.slice(0, 8)}…`);
              await loadOffers();
              await loadWallet();
              await loadNotificationCounts();
            } catch (err) {
              console.log('Errore activateByCode', err);
              const msg =
                typeof err === 'string'
                  ? err
                  : (err as any)?.body?.error || (err as any)?.message || JSON.stringify(err);
              setStatus(msg);
              Alert.alert('Errore', msg);
            } finally {
              setLoading(false);
            }
          }}>
          <Text style={styles.primaryBtnText}>Inquadra il QR e attiva il tuo wallet</Text>
        </TouchableOpacity>
        {status ? <Text style={styles.errorText}>{status}</Text> : null}
      </ScrollView>
    );
  }

  function renderRolePicker() {
    return (
      <SafeAreaView style={[backgroundStyle,{flex:1}]}>
        <View style={styles.screen}>
          <Text style={styles.roleWelcome}>PoPay ti da il benvenuto</Text>
          <Animated.Text style={[styles.rolePrompt, { opacity: roleIntroReady ? rolePromptOpacity : 1 }]}>
            Dimmi chi sei e ti dirò cosa cerchi
          </Animated.Text>
          <View style={styles.roleButtons}>
            <Animated.View style={{ transform: [{ translateX: roleIntroReady ? roleBtn1X : 0 }], opacity: roleIntroReady ? roleBtn1Opacity : 1 }}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  setRole('client');
                }}>
                <Text style={styles.primaryBtnText}>Cliente</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={{ transform: [{ translateX: roleIntroReady ? roleBtn2X : 0 }], opacity: roleIntroReady ? roleBtn2Opacity : 1 }}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  setRole('merchant');
                  setMerchantAuthed(false);
                  setMerchantAuthStep('login');
                }}>
                <Text style={styles.primaryBtnText}>Esercente</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={{ transform: [{ translateX: roleIntroReady ? roleBtn3X : 0 }], opacity: roleIntroReady ? roleBtn3Opacity : 1 }}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setRole('host')}>
                <Text style={styles.primaryBtnText}>Host</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  function renderClientAuth() {
    return (
      <SafeAreaView style={[backgroundStyle,{flex:1}]}>
        <View style={styles.screen}>
          <Text style={styles.title}>Accesso Cliente</Text>
          <Text style={styles.subtitle}>Inquadra o inserisci il QR ricevuto dall’host</Text>
          <TextInput
            value={accessCode}
            onChangeText={setAccessCode}
            placeholder="Codice QR"
            autoCapitalize="characters"
            style={styles.input}
          />
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={async () => {
              setLoading(true);
              setStatus('');
              try {
                const res = await activateByCode(accessCode.trim());
                setToken(res.token);
                setAuthUserId(res.userId);
                setAuthHostId(res.hostId);
                setWallet(null);
                setBookings([]);
                await loadOffers();
                await loadWallet();
                await loadNotificationCounts();
              } catch (err) {
                const msg =
                  typeof err === 'string'
                    ? err
                    : (err as any)?.body?.error || (err as any)?.message || JSON.stringify(err);
                setStatus(msg);
                Alert.alert('Errore', msg);
              } finally {
                setLoading(false);
              }
            }}>
            <Text style={styles.primaryBtnText}>Attiva accesso</Text>
          </TouchableOpacity>
          {status ? <Text style={styles.errorText}>{status}</Text> : null}
          <TouchableOpacity style={styles.ghostBtn} onPress={() => setRole(null)}>
            <Text style={styles.ghostBtnText}>Indietro</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function renderMerchantAuth() {
    return (
      <SafeAreaView style={[backgroundStyle,{flex:1}]}>
        <ScrollView contentContainerStyle={styles.tabContent}>
          <Text style={styles.title}>Accesso Esercente</Text>
          {merchantAuthStep === 'login' ? (
            <>
              <TextInput
                style={styles.input}
                value={merchantAuthEmail}
                onChangeText={setMerchantAuthEmail}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                value={merchantAuthPassword}
                onChangeText={setMerchantAuthPassword}
                placeholder="Password"
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  setMerchantAuthLoading(true);
                  try {
                    await merchantLogin({ email: merchantAuthEmail, password: merchantAuthPassword });
                    setMerchantAuthStep('otp');
                  } catch (e: any) {
                    Alert.alert('Errore', e?.body?.error || e?.message || 'Errore login');
                  } finally {
                    setMerchantAuthLoading(false);
                  }
                }}>
                <Text style={styles.primaryBtnText}>Invia OTP</Text>
              </TouchableOpacity>
              {merchantAuthLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setMerchantAuthStep('register')}>
                <Text style={styles.ghostBtnText}>Crea un account</Text>
              </TouchableOpacity>
              {__DEV__ ? (
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => {
                    setMerchantAuthEmail('demo@popay.local');
                    setMerchantAuthPassword('Demo1234!');
                  }}>
                  <Text style={styles.ghostBtnText}>Accesso demo</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}

          {merchantAuthStep === 'otp' ? (
            <>
              <Text style={styles.subtitle}>Inserisci il codice OTP ricevuto via email</Text>
              <TextInput
                style={styles.input}
                value={merchantAuthCode}
                onChangeText={setMerchantAuthCode}
                placeholder="Codice OTP"
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  setMerchantAuthLoading(true);
                    try {
                      const res = await merchantVerifyOtp({ email: merchantAuthEmail, code: merchantAuthCode });
                      setMerchantIdInput(String(res.businessId));
                      setMerchantAuthed(true);
                      setMerchantTab('commercial');
                      setCommercialExpanded(true);
                    } catch (e: any) {
                    Alert.alert('Errore', e?.body?.error || e?.message || 'Errore OTP');
                  } finally {
                    setMerchantAuthLoading(false);
                  }
                }}>
                <Text style={styles.primaryBtnText}>Verifica OTP</Text>
              </TouchableOpacity>
              {merchantAuthLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setMerchantAuthStep('login')}>
                <Text style={styles.ghostBtnText}>Torna al login</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {merchantAuthStep === 'register' ? (
            <>
              <Text style={styles.subtitle}>Registrazione esercente</Text>
              <TextInput style={styles.input} value={registerLegalName} onChangeText={setRegisterLegalName} placeholder="Ragione sociale" />
              <TextInput style={styles.input} value={registerBusinessName} onChangeText={setRegisterBusinessName} placeholder="Nome attività" />
              <TextInput style={styles.input} value={registerEmail} onChangeText={setRegisterEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} value={registerPhone} onChangeText={setRegisterPhone} placeholder="Telefono" keyboardType="phone-pad" />
              <TextInput style={styles.input} value={registerVatNumber} onChangeText={setRegisterVatNumber} placeholder="P. IVA" autoCapitalize="characters" />
              <TextInput style={styles.input} value={registerAddress} onChangeText={setRegisterAddress} placeholder="Indirizzo" />
              <TextInput style={styles.input} value={registerCity} onChangeText={setRegisterCity} placeholder="Città" />
              <TextInput style={styles.input} value={registerPassword} onChangeText={setRegisterPassword} placeholder="Password" secureTextEntry />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  setMerchantAuthLoading(true);
                  try {
                    await merchantRegister({
                      email: registerEmail,
                      password: registerPassword,
                      legalName: registerLegalName,
                      businessName: registerBusinessName,
                      phone: registerPhone,
                      vatNumber: registerVatNumber,
                      address: registerAddress,
                      city: registerCity,
                    });
                    setMerchantAuthEmail(registerEmail);
                    setMerchantAuthStep('verifyEmail');
                  } catch (e: any) {
                    Alert.alert('Errore', e?.body?.error || e?.message || 'Errore registrazione');
                  } finally {
                    setMerchantAuthLoading(false);
                  }
                }}>
                <Text style={styles.primaryBtnText}>Registrati</Text>
              </TouchableOpacity>
              {merchantAuthLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setMerchantAuthStep('login')}>
                <Text style={styles.ghostBtnText}>Hai già un account? Accedi</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {merchantAuthStep === 'verifyEmail' ? (
            <>
              <Text style={styles.subtitle}>Inserisci il codice di conferma email</Text>
              <TextInput
                style={styles.input}
                value={merchantAuthCode}
                onChangeText={setMerchantAuthCode}
                placeholder="Codice email"
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  setMerchantAuthLoading(true);
                  try {
                    await merchantVerifyEmail({ email: merchantAuthEmail, code: merchantAuthCode });
                    setMerchantAuthStep('login');
                  } catch (e: any) {
                    Alert.alert('Errore', e?.body?.error || e?.message || 'Errore verifica email');
                  } finally {
                    setMerchantAuthLoading(false);
                  }
                }}>
                <Text style={styles.primaryBtnText}>Verifica email</Text>
              </TouchableOpacity>
              {merchantAuthLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setMerchantAuthStep('login')}>
                <Text style={styles.ghostBtnText}>Torna al login</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity style={styles.ghostBtn} onPress={() => setRole(null)}>
            <Text style={styles.ghostBtnText}>Indietro</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  function renderMerchant() {
    const qrPayload = merchantPrepare
      ? JSON.stringify({
          transactionId: merchantPrepare.transactionId,
          userId: merchantPrepare.userId,
          merchantId: merchantPrepare.merchantId,
          net: merchantPrepare.net,
          reservationId: merchantPrepare.reservationId ?? null,
          partySize: merchantPrepare.partySize ?? null,
          unitPrice: merchantPrepare.unitPrice ?? null,
          standardPrice: merchantPrepare.standardPrice ?? null,
        })
      : null;
    const merchantMenuItems: { key: MerchantTab; label: string }[] = [
      { key: 'profile', label: 'Profilo' },
      { key: 'commercial', label: 'Info commerciali' },
      { key: 'demand', label: 'Domanda in corso' },
      { key: 'offers', label: 'Lancia offerta' },
      { key: 'reservations', label: 'Prenotazioni' },
      { key: 'payments', label: 'Incassi e QR' },
      { key: 'plan', label: 'Piano esercente' },
    ];
    const planDescriptions: Record<MerchantPlan, string[]> = {
      BASIC: [
        'Sei nel sistema e presente tra gli esercizi convenzionati.',
        'Puoi accettare pagamenti dagli utenti PoPay.',
        'Puoi visualizzare la domanda in corso che analizza le richieste di mercato.',
        'Costo della transazione: 2%.',
      ],
      RECOMMENDED: [
        'Sei nel sistema e presente tra gli esercizi convenzionati.',
        'Gli host della tua zona possono selezionarti come raccomandato.',
        'Puoi essere preferito dai clienti rispetto ai competitor.',
        'Puoi visualizzare la domanda in corso che analizza le richieste di mercato.',
        'Costo della transazione: 3%.',
      ],
      OFFERS: [
        'Sei nel sistema e presente tra gli esercizi convenzionati.',
        'Gli host della tua zona possono selezionarti come raccomandato.',
        'Puoi proporre offerte mirate per prodotto e orari.',
        'Sfrutti la domanda in corso che analizza le richieste di mercato.',
        'Costo della transazione: 4%.',
      ],
    };

    const merchantTabLabel =
      merchantMenuItems.find((item) => item.key === merchantTab)?.label ?? 'PoPay Merchant';

    const recommendedHosts: string[] = [];

    return (
      <SafeAreaView style={[backgroundStyle,{flex:1}]}>
        <ScrollView contentContainerStyle={styles.tabContent}>
          <View style={styles.merchantHeader}>
            <View>
              <Text style={styles.title}>PoPay Merchant</Text>
              <Text style={styles.subtitle}>{merchantTabLabel}</Text>
            </View>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setMerchantMenuVisible(true)}>
              <Text style={styles.menuBtnText}>Menu</Text>
            </TouchableOpacity>
          </View>
          {merchantTab === 'profile' ? (
            <>
              <Text style={styles.subtitle}>Profilo esercente</Text>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Anagrafica</Text>
                <View style={styles.profileRow}>
                  <Text style={styles.cardMeta}>Ragione sociale</Text>
                  <Text style={styles.cardMeta}>—</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.cardMeta}>Nome attività</Text>
                  <Text style={styles.cardMeta}>—</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.cardMeta}>P. IVA</Text>
                  <Text style={styles.cardMeta}>—</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.cardMeta}>Indirizzo</Text>
                  <Text style={styles.cardMeta}>—</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.cardMeta}>Città</Text>
                  <Text style={styles.cardMeta}>{offerCity || '—'}</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.cardMeta}>Merchant ID</Text>
                  <Text style={styles.cardMeta}>{merchantIdInput}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Piano attivo</Text>
                <Text style={styles.cardMeta}>{merchantPlan}</Text>
                <View style={styles.planDetail}>
                  {planDescriptions[merchantPlan].map((line, idx) => (
                    <Text key={`plan-${idx}`} style={styles.cardMeta}>{line}</Text>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Esercizio consigliato da</Text>
                {recommendedHosts.length === 0 ? (
                  <Text style={styles.cardMeta}>Nessun host ha ancora consigliato questo esercizio.</Text>
                ) : (
                  <View style={styles.recoList}>
                    {recommendedHosts.map((host) => (
                      <View key={host} style={styles.recoItem}>
                        <Text style={styles.cardMeta}>{host}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.card}>
                <View style={styles.notificationsHeader}>
                  <TouchableOpacity
                    style={styles.notificationsToggle}
                    onPress={() => setMerchantNotificationsExpanded((v) => !v)}>
                    <Text style={styles.cardTitle}>Notifiche</Text>
                    <View style={styles.notificationsBadge}>
                      <Text style={styles.notificationsBadgeText}>{merchantNotificationsCount}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ghostBtn} onPress={loadMerchantNotifications}>
                    <Text style={styles.ghostBtnText}>Aggiorna</Text>
                  </TouchableOpacity>
                  {__DEV__ ? (
                    <TouchableOpacity
                      style={styles.ghostBtn}
                      onPress={() => {
                        const fake = {
                          id: Date.now(),
                          title: 'Notifica demo',
                          body: 'Questa è una notifica simulata.',
                          created_at: new Date().toISOString(),
                        };
                        setMerchantNotifications((prev) => [fake, ...prev]);
                        setMerchantNotificationsCount((c) => c + 1);
                        setMerchantNotificationsExpanded(true);
                      }}>
                      <Text style={styles.ghostBtnText}>Simula</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {merchantNotificationsLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
                {merchantNotificationsExpanded ? (
                  merchantNotifications.length === 0 ? (
                    <Text style={styles.cardMeta}>Nessuna notifica disponibile.</Text>
                  ) : (
                    <View style={styles.recoList}>
                      {merchantNotifications.map((n) => {
                        const isOpen = merchantNotificationOpenId === n.id;
                        return (
                          <TouchableOpacity
                            key={n.id}
                            style={styles.notificationItem}
                            onPress={async () => {
                              const nextOpen = isOpen ? null : n.id;
                              setMerchantNotificationOpenId(nextOpen);
                              if (!isOpen && !n.read_at) {
                                try {
                                  await markMerchantNotificationRead(Number(merchantIdInput), n.id);
                                  setMerchantNotifications((prev) =>
                                    prev.map((x: any) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)
                                  );
                                  setMerchantNotificationsCount((c) => Math.max(0, c - 1));
                                } catch (e) {
                                  console.warn('[merchant] read notification error', e);
                                }
                              }
                            }}>
                            <View style={styles.notificationHeader}>
                              <Text style={styles.notificationTitle}>{n.title}</Text>
                              <Text style={styles.notificationDate}>
                                {new Date(n.created_at).toLocaleString()}
                              </Text>
                            </View>
                            {isOpen ? (
                              <Text style={styles.notificationBody}>{n.body}</Text>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )
                ) : (
                  <Text style={styles.cardMeta}>Tocca per visualizzare l’elenco.</Text>
                )}
              </View>
            </>
          ) : merchantTab === 'commercial' ? (
            <>
              <Text style={styles.subtitle}>Informazioni commerciali</Text>
              <Text style={styles.cardMeta}>
                Queste informazioni aiutano PoPay a stimare la domanda in base ai servizi offerti e alle fasce orarie.
                Seleziona il tipo di attività e almeno 3 punti di forza.
              </Text>
              <View style={styles.card}>
                <Text style={styles.cardMeta}>Tipo attività</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowActivityOptions(true)}>
                  <Text>{commercialActivityType || 'Seleziona attività'}</Text>
                </TouchableOpacity>
              </View>
              {commercialActivityType ? (
                <View style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardMeta}>Punti di forza</Text>
                    <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowStrengthOptions(true)}>
                      <Text style={styles.ghostBtnText}>Seleziona</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardMeta}>Seleziona almeno 3 voci e imposta la fascia oraria.</Text>
                  {commercialWindows.map((w) => (
                    <View key={w.label} style={styles.commercialRow}>
                      <Text style={[styles.cardMeta, styles.commercialLabel]}>{w.label}</Text>
                      <View style={styles.timeCol}>
                        <Text style={styles.timeLabel}>Inizio</Text>
                        <View style={styles.timeSelectRow}>
                          <TouchableOpacity
                            style={styles.timeSelect}
                            onPress={() => setOpenTimeMenu({ label: w.label, field: 'start', part: 'hour' })}>
                            <Text style={styles.timeSelectText}>{(w.start || '09:00').split(':')[0]}</Text>
                          </TouchableOpacity>
                          <Text style={styles.timeColon}>:</Text>
                          <TouchableOpacity
                            style={styles.timeSelect}
                            onPress={() => setOpenTimeMenu({ label: w.label, field: 'start', part: 'minute' })}>
                            <Text style={styles.timeSelectText}>{(w.start || '09:00').split(':')[1]}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.timeCol}>
                        <Text style={styles.timeLabel}>Fine</Text>
                        <View style={styles.timeSelectRow}>
                          <TouchableOpacity
                            style={styles.timeSelect}
                            onPress={() => setOpenTimeMenu({ label: w.label, field: 'end', part: 'hour' })}>
                            <Text style={styles.timeSelectText}>{(w.end || '12:00').split(':')[0]}</Text>
                          </TouchableOpacity>
                          <Text style={styles.timeColon}>:</Text>
                          <TouchableOpacity
                            style={styles.timeSelect}
                            onPress={() => setOpenTimeMenu({ label: w.label, field: 'end', part: 'minute' })}>
                            <Text style={styles.timeSelectText}>{(w.end || '12:00').split(':')[1]}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => setCommercialWindows((prev) => prev.filter((x) => x.label !== w.label))}>
                        <Text style={styles.removeBtnText}>Rimuovi</Text>
                      </TouchableOpacity>
                      {openTimeMenu && openTimeMenu.label === w.label ? (
                        <View style={styles.timeOptionsRow}>
                          {(openTimeMenu.part === 'hour' ? HOUR_OPTIONS : MINUTE_OPTIONS).map((opt) => (
                            <TouchableOpacity
                              key={`${openTimeMenu.field}-${openTimeMenu.part}-${opt}`}
                              style={styles.optionItem}
                              onPress={() => {
                                setCommercialWindows((prev) =>
                                  prev.map((x) => {
                                    if (x.label !== w.label) return x;
                                    const [h, m] = (openTimeMenu.field === 'start' ? x.start : x.end).split(':');
                                    const nextHour = openTimeMenu.part === 'hour' ? opt : h;
                                    const nextMinute = openTimeMenu.part === 'minute' ? opt : m;
                                    const nextTime = `${nextHour}:${nextMinute}`;
                                    return openTimeMenu.field === 'start'
                                      ? { ...x, start: nextTime }
                                      : { ...x, end: nextTime };
                                  })
                                );
                                setOpenTimeMenu(null);
                              }}>
                              <Text style={styles.optionText}>{opt}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  const merchantId = Number(merchantIdInput);
                  if (!Number.isFinite(merchantId)) {
                    Alert.alert('Errore', 'Merchant ID non valido');
                    return;
                  }
                  if (!commercialActivityType) {
                    Alert.alert('Errore', 'Seleziona il tipo attività');
                    return;
                  }
                  if (commercialWindows.length < 3) {
                    Alert.alert('Errore', 'Seleziona almeno 3 punti di forza');
                    return;
                  }
                  if (commercialWindows.some((w) => !w.start || !w.end)) {
                    Alert.alert('Errore', 'Inserisci orari validi per ogni punto di forza');
                    return;
                  }
                  setCommercialLoading(true);
                  try {
                    await updateMerchantDemandWindows(merchantId, {
                      activityType: commercialActivityType,
                      windows: commercialWindows.map((w) => ({ label: w.label, start: w.start, end: w.end })),
                    });
                    Alert.alert('Salvato', 'Informazioni commerciali aggiornate');
                    loadMerchantDemand();
                  } catch (e: any) {
                    Alert.alert('Errore', e?.body?.error || e?.message || 'Errore salvataggio');
                  } finally {
                    setCommercialLoading(false);
                  }
                }}>
                <Text style={styles.primaryBtnText}>Salva informazioni</Text>
              </TouchableOpacity>
              {commercialLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
            </>
          ) : merchantTab === 'payments' ? (
            <>
          <Text style={styles.subtitle}>Inserisci importo lordo (prezzo di listino)</Text>

          <View style={styles.card}>
            <Text style={styles.cardMeta}>Merchant ID</Text>
            <TextInput style={styles.input} value={merchantIdInput} onChangeText={setMerchantIdInput} keyboardType="number-pad" />
            <Text style={styles.cardMeta}>User ID cliente</Text>
            <TextInput style={styles.input} value={merchantUserIdInput} onChangeText={setMerchantUserIdInput} keyboardType="number-pad" />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardMeta}>Importo lordo</Text>
            <TextInput
              style={styles.input}
              value={merchantGrossInput}
              onChangeText={setMerchantGrossInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardMeta}>Listino: € {fmtMoney(merchantSummary.gross)}</Text>
            <Text style={styles.cardMeta}>Sconto PoPay ({MERCHANT_DISCOUNT_PCT}%): € {fmtMoney(merchantSummary.discount)}</Text>
            <Text style={styles.cardMeta}>Netto cliente: € {fmtMoney(merchantSummary.net)}</Text>
            <Text style={styles.cardMeta}>Commissione ({merchantSummary.feePct}%): € {fmtMoney(merchantSummary.fee)}</Text>
            <Text style={styles.cardTitle}>Incasso merchant: € {fmtMoney(merchantSummary.merchantNet)}</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={async () => {
              const merchantId = Number(merchantIdInput);
              const userId = Number(merchantUserIdInput);
              const gross = Number(merchantGrossInput.replace(',', '.'));
              if (!Number.isFinite(merchantId) || !Number.isFinite(userId) || !Number.isFinite(gross)) {
                Alert.alert('Errore', 'Dati non validi');
                return;
              }
              setMerchantLoading(true);
              try {
                const res = await payPrepare({ userId, merchantId, gross });
                console.log('[merchant] payPrepare', res);
                setMerchantPrepare(res);
                setMerchantQrVisible(true);
              } catch (e: any) {
                Alert.alert('Errore', e?.body?.error || e?.message || 'Errore prepare');
              } finally {
                setMerchantLoading(false);
              }
            }}>
            <Text style={styles.primaryBtnText}>Genera QR pagamento</Text>
          </TouchableOpacity>
          {merchantLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
          {qrPayload ? (
            <View style={styles.card}>
              <Text style={styles.cardMeta}>QR pagamento</Text>
            </View>
          ) : null}
          {!qrPayload ? (
            <View style={styles.card}>
              <Text style={styles.cardMeta}>QR non generato</Text>
              <Text style={styles.cardMeta}>Premi “Genera QR pagamento” per creare il codice.</Text>
              {merchantPrepare ? (
                <Text style={styles.cardMeta}>{JSON.stringify(merchantPrepare)}</Text>
              ) : null}
            </View>
          ) : null}
            </>
          ) : merchantTab === 'offers' ? (
            <>
              <Text style={styles.subtitle}>Crea un’offerta che apparirà all’utente</Text>
              <View style={styles.gatedWrap}>
                <View
                  pointerEvents={merchantPlan === 'OFFERS' ? 'auto' : 'none'}
                  style={merchantPlan !== 'OFFERS' ? styles.gatedContent : null}>
              <View style={styles.card}>
                <Text style={styles.cardMeta}>Titolo</Text>
                <TextInput
                  style={[styles.input, errorInput('title')]}
                  value={offerTitle}
                  onChangeText={setOfferTitle}
                  placeholder="Es. Cena vista mare"
                />
                {offerErrors.title ? <Text style={styles.errorText}>{offerErrors.title}</Text> : null}
                <Text style={styles.cardMeta}>Descrizione</Text>
                <TextInput
                  style={styles.input}
                  value={offerDescription}
                  onChangeText={setOfferDescription}
                  placeholder="Dettagli offerta"
                />
                <Text style={[styles.cardMeta, styles.cardMetaStrong]}>Prezzo offerta (€)</Text>
                <TextInput
                  style={[styles.input, errorInput('price')]}
                  value={offerPriceInput}
                  onChangeText={setOfferPriceInput}
                  keyboardType="decimal-pad"
                  placeholder="Es. 10,00"
                />
                {offerErrors.price ? <Text style={styles.errorText}>{offerErrors.price}</Text> : null}
                <Text style={styles.cardMeta}>Prezzo commerciale (€)</Text>
                <TextInput
                  style={[styles.input, errorInput('standardPrice')]}
                  value={offerStandardPriceInput}
                  onChangeText={setOfferStandardPriceInput}
                  keyboardType="decimal-pad"
                  placeholder="Es. 15,00"
                />
                {offerErrors.standardPrice ? <Text style={styles.errorText}>{offerErrors.standardPrice}</Text> : null}
                <Text style={styles.cardMeta}>Tipo evento</Text>
                <TextInput style={styles.input} value={offerMealType} onChangeText={setOfferMealType} placeholder="Pranzo / Cena" />
                <Text style={styles.cardMeta}>Città</Text>
                <TextInput style={styles.input} value={offerCity} onChangeText={setOfferCity} />
                <Text style={styles.cardMeta}>Inizio</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.input, styles.inputHalf, errorInput('time')]}
                    onPress={() => setShowStartDatePicker(true)}>
                    <Text>{offerStartDate}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.input, styles.inputHalf, errorInput('time')]}
                    onPress={() => setShowStartTimePicker(true)}>
                    <Text>{offerStartTime}</Text>
                  </TouchableOpacity>
                </View>
                {offerErrors.time ? <Text style={styles.errorText}>{offerErrors.time}</Text> : null}
                <Text style={styles.cardMeta}>Fine</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.input, styles.inputHalf, errorInput('time')]}
                    onPress={() => setShowEndDatePicker(true)}>
                    <Text>{offerEndDate}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.input, styles.inputHalf, errorInput('time')]}
                    onPress={() => setShowEndTimePicker(true)}>
                    <Text>{offerEndTime}</Text>
                  </TouchableOpacity>
                </View>
                {offerErrors.time ? <Text style={styles.errorText}>{offerErrors.time}</Text> : null}
                <View style={styles.row}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => {
                      const nowRounded = roundTo5(new Date());
                      setOfferStartDate(nowRounded.toISOString().slice(0,10));
                      setOfferStartTime(nowRounded.toTimeString().slice(0,5));
                      const end = new Date(nowRounded.getTime() + 2 * 60 * 60 * 1000);
                      setOfferEndDate(end.toISOString().slice(0,10));
                      setOfferEndTime(end.toTimeString().slice(0,5));
                    }}>
                    <Text style={styles.secondaryBtnText}>Adesso</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setOfferEndTime(nextHour(offerStartTime, 1))}>
                    <Text style={styles.secondaryBtnText}>+1h</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setOfferEndTime(nextHour(offerStartTime, 2))}>
                    <Text style={styles.secondaryBtnText}>+2h</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardMeta}>Quantità disponibile</Text>
                <TextInput
                  style={[styles.input, errorInput('qty')]}
                  value={offerQtyInput}
                  onChangeText={setOfferQtyInput}
                  keyboardType="number-pad"
                />
                {offerErrors.qty ? <Text style={styles.errorText}>{offerErrors.qty}</Text> : null}
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  const errors: typeof offerErrors = {};
                  const merchantId = Number(merchantIdInput);
                  const price = Number(offerPriceInput.replace(',', '.'));
                  const standardPrice = Number(offerStandardPriceInput.replace(',', '.'));
                  const qty = Number(offerQtyInput);
                  const startsAt = `${offerStartDate}T${offerStartTime}:00`;
                  const endsAt = `${offerEndDate}T${offerEndTime}:00`;
                  const startDate = new Date(startsAt);
                  const endDate = new Date(endsAt);
                  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
                    errors.time = 'La fine deve essere successiva all’inizio';
                    Alert.alert('Errore', 'La fine deve essere successiva all’inizio');
                  }
                  if (!Number.isFinite(merchantId)) {
                    errors.merchantId = 'Merchant ID non valido';
                  }
                  if (!offerTitle.trim()) {
                    errors.title = 'Titolo obbligatorio';
                  }
                  if (!Number.isFinite(price) || price <= 0) {
                    errors.price = 'Prezzo non valido';
                  }
                  if (!Number.isFinite(standardPrice) || standardPrice <= 0) {
                    errors.standardPrice = 'Prezzo standard non valido';
                  }
                  if (Number.isFinite(standardPrice) && Number.isFinite(price) && standardPrice <= price) {
                    errors.standardPrice = 'Prezzo standard deve essere maggiore del prezzo offerta';
                  }
                  if (Number.isFinite(qty) && qty <= 0) {
                    errors.qty = 'Quantità deve essere > 0';
                  }
                  setOfferErrors(errors);
                  if (Object.keys(errors).length > 0) return;
                  setOfferLoading(true);
                  try {
                    const res = await createFlashOffer({
                      merchantId,
                      title: offerTitle,
                      description: offerDescription || null,
                      price,
                      standardPrice,
                      mealType: offerMealType || null,
                      city: offerCity || null,
                      startsAt,
                      endsAt,
                    quantityAvailable: Number.isFinite(qty) ? qty : null,
                  });
                    setOfferResult(res);
                    Alert.alert('Offerta pubblicata', `ID #${res.id}`);
                  } catch (e: any) {
                    Alert.alert('Errore', e?.body?.error || e?.message || 'Errore pubblicazione');
                  } finally {
                    setOfferLoading(false);
                  }
                }}>
                <Text style={styles.primaryBtnText}>Pubblica offerta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setOfferTitle('');
                  setOfferDescription('');
                  setOfferPriceInput('');
                  setOfferStandardPriceInput('');
                  setOfferMealType('Cena');
                  setOfferCity(DEMO_CITY);
                  const nowRounded = roundTo5(new Date());
                  setOfferStartDate(nowRounded.toISOString().slice(0,10));
                  setOfferStartTime(nowRounded.toTimeString().slice(0,5));
                  const end = new Date(nowRounded.getTime() + 2 * 60 * 60 * 1000);
                  setOfferEndDate(end.toISOString().slice(0,10));
                  setOfferEndTime(end.toTimeString().slice(0,5));
                  setOfferQtyInput('20');
                  setOfferErrors({});
                  setOfferResult(null);
                }}>
                <Text style={styles.secondaryBtnText}>Reset form</Text>
              </TouchableOpacity>
              {offerLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
              {offerResult ? (
                <View style={styles.card}>
                  <Text style={styles.cardMeta}>Offerta creata</Text>
                  <Text style={styles.cardMeta}>#{offerResult.id} • {offerResult.title}</Text>
                  <Text style={styles.cardMeta}>{offerResult.description || '—'}</Text>
                  <Text style={styles.cardMeta}>€ {fmtMoney(offerResult.price)}</Text>
                  <Text style={styles.cardMeta}>Tipo evento: {offerResult.mealType || '—'}</Text>
                  <Text style={styles.cardMeta}>Città: {offerResult.merchant?.city || offerCity || '—'}</Text>
                  <Text style={styles.cardMeta}>Inizio: {offerResult.startsAt}</Text>
                  <Text style={styles.cardMeta}>Fine: {offerResult.endsAt}</Text>
                  <Text style={styles.cardMeta}>Quantità: {offerResult.quantityAvailable ?? '—'}</Text>
                </View>
              ) : null}
                </View>
                {merchantPlan !== 'OFFERS' ? (
                  <View style={styles.gatedOverlay}>
                    <Text style={styles.gatedTitle}>Vuoi lanciare la tua offerta?</Text>
                    <Text style={styles.cardMeta}>Passa al piano OFFERS per attivare questa funzione.</Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => setMerchantTab('plan')}>
                      <Text style={styles.primaryBtnText}>Vai a Piano esercente</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </>
          ) : merchantTab === 'reservations' ? (
            <>
              <Text style={styles.subtitle}>Prenotazioni ricevute</Text>
              <TextInput
                style={styles.input}
                placeholder="Cerca per nome o ID prenotazione"
                value={merchantReservationQuery}
                onChangeText={setMerchantReservationQuery}
              />
              {merchantReservationsLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
              {merchantReservations
                .filter((r) => {
                  const q = merchantReservationQuery.trim().toLowerCase();
                  if (!q) return true;
                  const idMatch = String(r.id).includes(q);
                  const nameMatch = (r.user?.fullName || '').toLowerCase().includes(q);
                  return idMatch || nameMatch;
                })
                .map((r) => {
                const start = r.offer?.startTime ? new Date(r.offer.startTime) : null;
                const isLate = start ? Date.now() > start.getTime() + 15 * 60 * 1000 : false;
                const shouldFlash = isLate && r.depositStatus === 'held';
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.card,
                      shouldFlash && flashOn ? styles.flashCard : null,
                      shouldFlash && !flashOn ? styles.flashCardAlt : null,
                    ]}
                    onPress={() => {
                      if (shouldFlash) {
                        setSelectedReservation(r);
                        setConfirmModalVisible(true);
                      }
                    }}>
                    <Text style={styles.cardTitle}>Prenotazione PR-{String(r.id).padStart(4, '0')}</Text>
                    <Text style={styles.cardMeta}>
                      Cliente: {r.user?.fullName || '—'}
                      {r.user?.phone ? ` • ****${r.user.phone.slice(-4)}` : ''}
                    </Text>
                    {r.depositStatus === 'confirmed' ? (
                      <View style={styles.statusBadgeGreen}><Text style={styles.statusBadgeText}>Presente</Text></View>
                    ) : null}
                    {r.depositStatus === 'forfeited' ? (
                      <View style={styles.statusBadgeRed}><Text style={styles.statusBadgeTextRed}>Assente</Text></View>
                    ) : null}
                    {r.depositStatus === 'held' ? (
                      <View style={styles.statusBadgeGray}><Text style={styles.statusBadgeTextGray}>In attesa</Text></View>
                    ) : null}
                  <Text style={styles.cardMeta}>Cauzione: {r.depositStatus || '—'} • € {r.depositAmount || '0,00'}</Text>
                  <Text style={styles.cardMeta}>Offerta: {r.offer?.title || '—'}</Text>
                  <Text style={styles.cardMeta}>Prezzo per persona: € {r.offer?.price || '0,00'}</Text>
                  <Text style={styles.cardMeta}>Persone: {r.partySize || 1}</Text>
                  <Text style={styles.cardMeta}>Totale: € {fmtMoney((r.offer?.price ? Number(r.offer.price) : 0) * (r.partySize || 1))}</Text>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={async () => {
                      try {
                        const res = await payPrepareReservation({
                          reservationId: r.id,
                          merchantId: Number(merchantIdInput),
                        });
                        setMerchantPrepare(res);
                        setMerchantQrVisible(true);
                      } catch (e: any) {
                        Alert.alert('Errore', e?.body?.error || e?.message || 'Errore QR prenotazione');
                      }
                    }}>
                    <Text style={styles.primaryBtnText}>Genera QR prenotazione</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )})}
              <Modal visible={confirmModalVisible} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                  <View style={styles.modalCard}>
                    <Text style={styles.cardTitle}>Cliente presente?</Text>
                    <View style={styles.row}>
                      <TouchableOpacity
                        style={[styles.primaryBtn, styles.confirmBtn]}
                        onPress={async () => {
                          if (!selectedReservation) return;
                          Alert.alert(
                            'Conferma presenza',
                            'Confermi che il cliente è presente?',
                            [
                              { text: 'Annulla', style: 'cancel' },
                              { text: 'Conferma', onPress: async () => {
                                  await confirmReservationArrival(selectedReservation.id);
                                  setConfirmModalVisible(false);
                                  loadMerchantReservations();
                                } },
                            ]
                          );
                        }}>
                        <Text style={styles.primaryBtnText}>✅</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.secondaryBtn, styles.denyBtn]}
                        onPress={async () => {
                          if (!selectedReservation) return;
                          Alert.alert(
                            'Conferma assenza',
                            'Confermi che il cliente NON è presente?',
                            [
                              { text: 'Annulla', style: 'cancel' },
                              { text: 'Conferma', onPress: async () => {
                                  await cancelReservation(selectedReservation.id);
                                  setConfirmModalVisible(false);
                                  loadMerchantReservations();
                                } },
                            ]
                          );
                        }}>
                        <Text style={styles.secondaryBtnText}>⛔️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </>
          ) : merchantTab === 'demand' ? (
            <>
              <Text style={styles.subtitle}>Domanda in corso</Text>
              {merchantDemandLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
              {merchantDemand ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Domanda in corso</Text>
                  <Text style={styles.cardMeta}>Presenze attive: {merchantDemand.activeUsers}</Text>
                  {merchantDemand.windows?.length ? (() => {
                    const top = merchantDemand.windows.reduce((a: any, b: any) => (b.demandPercent > a.demandPercent ? b : a));
                    const level = demandLevelFromPercent(top.demandPercent);
                    return (
                      <View style={styles.demandHero}>
                        <View style={[styles.demandBadge, level === 'HIGH' ? styles.badgeGreen : level === 'MEDIUM' ? styles.badgeYellow : styles.badgeRed]}>
                          <Text style={styles.badgeText}>{level === 'HIGH' ? 'ALTA' : level === 'MEDIUM' ? 'MEDIA' : 'BASSA'}</Text>
                        </View>
                        <Text style={styles.demandTitle}>
                          {level === 'HIGH' ? 'È il momento giusto per lanciare un’offerta' : 'Meglio aspettare'}
                        </Text>
                        <Text style={styles.cardMeta}>Suggerimento: {top.label} ({top.demandPercent}%)</Text>
                        <TouchableOpacity style={styles.primaryBtn} onPress={() => setMerchantTab('offers')}>
                          <Text style={styles.primaryBtnText}>Crea offerta</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })() : null}
                  {merchantDemand.windows?.map((w: any) => (
                    <View key={w.label} style={styles.demandRow}>
                      <Text style={styles.cardMeta}>{w.label} ({w.start}-{w.end})</Text>
                      <View style={styles.demandBar}>
                        <View style={[styles.demandBarFill, { width: `${w.demandPercent}%` }]} />
                      </View>
                      <Text style={styles.demandValue}>{w.demandPercent}%</Text>
                    </View>
                  ))}
                  <Text style={styles.cardMeta}>Aggiornato: {new Date(merchantDemand.updatedAt).toLocaleTimeString()}</Text>
                </View>
              ) : null}
              <View style={styles.card}>
                <Text style={styles.cardMeta}>Le informazioni commerciali si configurano nella sezione dedicata.</Text>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setMerchantTab('commercial')}>
                  <Text style={styles.ghostBtnText}>Vai a Informazioni commerciali</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>Piano esercente</Text>
              <View style={styles.card}>
                <Text style={styles.cardMeta}>Seleziona il piano contrattuale.</Text>
                <Text style={styles.cardMeta}>Piano attivo: {merchantPlan}</Text>
                <View style={styles.row}>
                  {(['BASIC','RECOMMENDED','OFFERS'] as MerchantPlan[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.secondaryBtn, merchantPlanDraft === p ? styles.planActive : null]}
                      onPress={() => setMerchantPlanDraft(p)}>
                      <Text style={styles.secondaryBtnText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.planDetail}>
                  {planDescriptions[merchantPlanDraft].map((line, idx) => (
                    <Text key={`${merchantPlanDraft}-${idx}`} style={styles.cardMeta}>{line}</Text>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={async () => {
                    const merchantId = Number(merchantIdInput);
                    if (!Number.isFinite(merchantId)) {
                      Alert.alert('Errore', 'Merchant ID non valido');
                      return;
                    }
                    setMerchantPlanSaving(true);
                    try {
                      const res = await updateMerchantPlan(merchantId, merchantPlanDraft);
                      setMerchantPlan(res.plan as MerchantPlan);
                      Alert.alert('Piano aggiornato', 'Cambio completato. Riceverai una notifica ed email di conferma.');
                    } catch (e: any) {
                      Alert.alert('Errore', e?.body?.error || e?.message || 'Errore aggiornamento piano');
                    } finally {
                      setMerchantPlanSaving(false);
                    }
                  }}>
                  <Text style={styles.primaryBtnText}>Applica piano</Text>
                </TouchableOpacity>
                {merchantPlanSaving ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
              </View>
            </>
          )}
        </ScrollView>
        <Modal visible={showActivityOptions} transparent animationType="fade" onRequestClose={() => setShowActivityOptions(false)}>
          <View style={styles.optionOverlay}>
            <TouchableOpacity style={styles.optionBackdrop} activeOpacity={1} onPress={() => setShowActivityOptions(false)} />
            <View style={styles.optionSheet}>
              <Text style={styles.cardTitle}>Seleziona tipo attività</Text>
              <ScrollView style={styles.optionList}>
                {ACTIVITY_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.optionItem, commercialActivityType === t ? styles.optionItemActive : null]}
                    onPress={() => {
                      setCommercialActivityType(t);
                      setCommercialWindows([]);
                      setShowActivityOptions(false);
                    }}>
                    <Text style={styles.optionText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
        <Modal visible={showStrengthOptions} transparent animationType="fade" onRequestClose={() => setShowStrengthOptions(false)}>
          <View style={styles.optionOverlay}>
            <TouchableOpacity style={styles.optionBackdrop} activeOpacity={1} onPress={() => setShowStrengthOptions(false)} />
            <View style={styles.optionSheet}>
              <Text style={styles.cardTitle}>Seleziona punti di forza</Text>
              <ScrollView style={styles.optionList}>
                {(commercialActivityType ? STRENGTHS_BY_ACTIVITY[commercialActivityType] : [])?.map((s) => {
                  const selected = commercialWindows.find((w) => w.label === s);
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.optionItem, selected ? styles.optionItemActive : null]}
                      onPress={() => {
                        if (selected) {
                          setCommercialWindows((prev) => prev.filter((w) => w.label !== s));
                        } else {
                          setCommercialWindows((prev) => [...prev, { label: s, start: '09:00', end: '12:00' }]);
                        }
                      }}>
                      <Text style={styles.optionText}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowStrengthOptions(false)}>
                <Text style={styles.primaryBtnText}>Fatto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={merchantMenuVisible} transparent animationType="slide" onRequestClose={() => setMerchantMenuVisible(false)}>
          <View style={styles.drawerOverlay}>
            <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={() => setMerchantMenuVisible(false)} />
            <View style={styles.drawer}>
              <View style={styles.drawerHeader}>
                <Text style={styles.title}>Menu</Text>
                <TouchableOpacity style={styles.drawerClose} onPress={() => setMerchantMenuVisible(false)}>
                  <Text style={styles.drawerCloseText}>Chiudi</Text>
                </TouchableOpacity>
              </View>
              {merchantMenuItems.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.sheetItem, merchantTab === item.key ? styles.sheetItemActive : null]}
                  onPress={() => {
                    setMerchantTab(item.key);
                    setMerchantMenuVisible(false);
                  }}>
                  <Text style={[styles.sheetItemText, merchantTab === item.key ? styles.sheetItemTextActive : null]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
        {showStartDatePicker ? (
          <DateTimePicker
            value={new Date(`${offerStartDate}T${offerStartTime}:00`)}
            mode="date"
            onChange={(_, d) => {
              setShowStartDatePicker(false);
              if (d) setOfferStartDate(d.toISOString().slice(0,10));
            }}
          />
        ) : null}
        {showStartTimePicker ? (
          <DateTimePicker
            value={new Date(`${offerStartDate}T${offerStartTime}:00`)}
            mode="time"
            onChange={(_, d) => {
              setShowStartTimePicker(false);
              if (d) setOfferStartTime(d.toTimeString().slice(0,5));
            }}
          />
        ) : null}
        {showEndDatePicker ? (
          <DateTimePicker
            value={new Date(`${offerEndDate}T${offerEndTime}:00`)}
            mode="date"
            onChange={(_, d) => {
              setShowEndDatePicker(false);
              if (d) setOfferEndDate(d.toISOString().slice(0,10));
            }}
          />
        ) : null}
        {showEndTimePicker ? (
          <DateTimePicker
            value={new Date(`${offerEndDate}T${offerEndTime}:00`)}
            mode="time"
            onChange={(_, d) => {
              setShowEndTimePicker(false);
              if (d) setOfferEndTime(d.toTimeString().slice(0,5));
            }}
          />
        ) : null}
        <Modal visible={merchantQrVisible} animationType="slide" transparent={false}>
          <SafeAreaView style={styles.qrFull}>
            <Text style={styles.qrTitle}>Mostra questo QR al cliente</Text>
            {qrPayload ? <QRCode value={qrPayload} size={260} /> : null}
            {qrPayload ? <Text style={styles.qrPayload}>{qrPayload}</Text> : null}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setMerchantQrVisible(false)}>
              <Text style={styles.primaryBtnText}>Chiudi</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  function renderHost() {
    return (
      <SafeAreaView style={[backgroundStyle,{flex:1}]}>
        <View style={styles.screen}>
          <Text style={styles.title}>Host</Text>
          <Text style={styles.subtitle}>Funzionalità host in arrivo.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{flex:1}}>
      {role === null ? renderRolePicker() : null}
      {role === 'merchant' ? (merchantAuthed ? renderMerchant() : renderMerchantAuth()) : null}
      {role === 'host' ? renderHost() : null}
      {role === 'client' ? (!token ? renderClientAuth() : (
        <>
          <SafeAreaView style={[backgroundStyle,{flex:1}]}>
            <View style={styles.bgGlowTop} />
            <View style={styles.bgGlowBottom} />
            <StatusBar
              barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              backgroundColor={backgroundStyle.backgroundColor}
            />
            <View style={styles.screen}>
              {activeTab === 'offers' && renderOffersTab()}
              {activeTab === 'bookings' && renderBookingsTab()}
              {activeTab === 'wallet' && renderWalletTab()}
              {activeTab === 'profile' && renderProfileTab()}
              <View style={styles.tabBar}>
                <TabButton label="Offerte" badge={notifCounts.offers} active={activeTab === 'offers'} onPress={() => setActiveTab('offers')} />
                <TabButton label="Prenotazioni" badge={notifCounts.bookings} active={activeTab === 'bookings'} onPress={() => setActiveTab('bookings')} />
                <TabButton label="Wallet" active={activeTab === 'wallet'} onPress={() => setActiveTab('wallet')} />
                <TabButton label="Profilo" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
              </View>
            </View>
          </SafeAreaView>
          <Modal visible={scanVisible} animationType="slide" transparent={false}>
            <SafeAreaView style={styles.qrFull}>
              <Text style={styles.qrTitle}>Inquadra il QR dell’esercente</Text>
              {!device ? (
                <Text style={styles.cardMeta}>Fotocamera non disponibile</Text>
              ) : null}
              {device ? (
                <Camera style={{ width: '100%', height: 420 }} device={device} isActive={scanVisible} codeScanner={codeScanner} />
              ) : null}
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setScanVisible(false)}>
                <Text style={styles.primaryBtnText}>Chiudi</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Modal>
        </>
      )) : null}
    </View>
  );
}

function nextHour(time: string, add: number) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours((h + add) % 24);
  d.setMinutes(m || 0);
  return d.toTimeString().slice(0,5);
}

function roundTo5(date: Date) {
  const ms = 5 * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

function fmtMoney(v: number | string | null | undefined) {
  if (v == null) return '0.00';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TabButton({label, active, onPress, badge}: {label: string; active: boolean; onPress: () => void; badge?: number}) {
  return (
    <TouchableOpacity style={[styles.tabBtn, active ? styles.tabBtnActive : null]} onPress={onPress}>
      <View style={styles.tabBtnInner}>
        <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{label}</Text>
        {badge && badge > 0 ? (
          <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabContent: {
    padding: 18,
    paddingBottom: 110,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.ink,
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium' }),
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.inkSoft,
    marginBottom: 12,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: THEME.card,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  detailCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: THEME.bgAlt,
    marginTop: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.ink,
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium' }),
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: THEME.inkSoft,
    marginBottom: 4,
  },
  cardMetaStrong: {
    fontWeight: '700',
  },
  flashCard: {
    borderColor: '#E76F51',
    borderWidth: 2,
    backgroundColor: '#FFE8DF',
    transform: [{ scale: 1.02 }],
  },
  flashCardAlt: {
    backgroundColor: '#FFF2E9',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: THEME.card,
    padding: 20,
    borderRadius: 16,
    width: '80%',
  },
  confirmBtn: { flex: 1, marginRight: 8, alignItems: 'center' },
  denyBtn: { flex: 1, alignItems: 'center' },
  demandRow: {
    marginTop: 8,
  },
  demandBar: {
    height: 8,
    backgroundColor: '#E9EEF2',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
  demandBarFill: {
    height: 8,
    backgroundColor: THEME.coral,
  },
  demandValue: {
    fontSize: 11,
    color: THEME.inkSoft,
    marginTop: 2,
  },
  demandHero: {
    marginTop: 8,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFF2E9',
  },
  demandBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 6,
  },
  badgeGreen: { backgroundColor: '#2E7D32' },
  badgeYellow: { backgroundColor: '#F9A825' },
  badgeRed: { backgroundColor: '#C62828' },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  demandTitle: { fontSize: 14, fontWeight: '700', color: THEME.ink, marginBottom: 4 },
  statusBadgeGreen: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  statusBadgeRed: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDECEC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#1B5E20' },
  statusBadgeTextRed: { fontSize: 11, fontWeight: '700', color: '#B00020' },
  statusBadgeGray: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF1F4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  statusBadgeTextGray: { fontSize: 11, fontWeight: '700', color: '#5B6B78' },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryBtn: {
    backgroundColor: THEME.coral,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  payBtn: {
    backgroundColor: THEME.ink,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  payBtnText: {
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 16,
  },
  payBar: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: THEME.card,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  secondaryBtn: {
    backgroundColor: THEME.bgAlt,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  secondaryBtnText: {
    color: THEME.ink,
    fontWeight: '700',
  },
  planActive: {
    backgroundColor: THEME.bgAlt,
  },
  planDetail: {
    marginTop: 8,
  },
  gatedWrap: {
    position: 'relative',
  },
  gatedContent: {
    opacity: 0.6,
  },
  gatedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,249,241,0.45)',
    borderRadius: 14,
  },
  gatedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  recoList: {
    maxHeight: 140,
    marginTop: 8,
  },
  recoItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  notificationItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.bgAlt,
    marginBottom: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  notificationTitle: {
    color: THEME.ink,
    fontWeight: '800',
    flex: 1,
  },
  notificationBody: {
    color: THEME.inkSoft,
    marginBottom: 6,
    marginTop: 8,
  },
  notificationDate: {
    color: THEME.inkSoft,
    fontSize: 12,
    marginLeft: 8,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationsBadge: {
    backgroundColor: THEME.coral,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  notificationsBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  optionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,42,61,0.35)',
    justifyContent: 'flex-end',
  },
  optionBackdrop: {
    flex: 1,
  },
  optionSheet: {
    backgroundColor: THEME.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '70%',
  },
  optionList: {
    marginTop: 8,
    marginBottom: 12,
  },
  optionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: THEME.bgAlt,
  },
  optionItemActive: {
    borderWidth: 1,
    borderColor: THEME.coral,
  },
  optionText: {
    color: THEME.ink,
    fontWeight: '700',
  },
  commercialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  commercialLabel: {
    minWidth: 100,
  },
  timeLabel: {
    fontSize: 12,
    color: THEME.inkSoft,
    marginBottom: 4,
  },
  removeBtn: {
    backgroundColor: THEME.bgAlt,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  removeBtnText: {
    color: THEME.inkSoft,
    fontWeight: '700',
  },
  timeSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSelect: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: THEME.card,
    minWidth: 52,
    alignItems: 'center',
  },
  timeSelectText: {
    color: THEME.ink,
    fontWeight: '700',
  },
  timeColon: {
    color: THEME.inkSoft,
    fontWeight: '700',
  },
  timeOptionsRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  timeCol: {
    flex: 1,
  },
  roleWelcome: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  rolePrompt: {
    fontSize: 16,
    color: THEME.inkSoft,
    textAlign: 'center',
    marginBottom: 16,
  },
  roleButtons: {
    gap: 10,
    width: '100%',
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  menuBtn: {
    backgroundColor: THEME.coral,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  menuBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  menuList: {
    gap: 10,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15,42,61,0.35)',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawer: {
    width: '78%',
    backgroundColor: THEME.bg,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  drawerClose: {
    backgroundColor: THEME.bgAlt,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  drawerCloseText: {
    color: THEME.ink,
    fontWeight: '700',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,42,61,0.35)',
  },
  sheet: {
    backgroundColor: THEME.card,
    paddingBottom: 24,
    paddingTop: 8,
    paddingHorizontal: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: THEME.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetItem: {
    paddingVertical: 12,
  },
  sheetItemActive: {
    backgroundColor: THEME.bgAlt,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  sheetItemText: {
    color: THEME.ink,
    fontWeight: '700',
  },
  sheetItemTextActive: {
    color: THEME.coral,
  },
  merchantTabBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  merchantTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    backgroundColor: THEME.card,
  },
  merchantTabActive: {
    backgroundColor: THEME.coral,
    borderColor: THEME.coral,
  },
  merchantTabText: { color: THEME.ink, fontWeight: '700' },
  merchantTabTextActive: { color: '#fff' },
  errorText: {
    color: '#B00020',
    fontSize: 12,
    marginBottom: 6,
  },
  inputError: {
    borderColor: '#B00020',
  },
  qrFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: THEME.bg,
    padding: 24,
  },
  qrTitle: { fontSize: 16, fontWeight: '700', color: THEME.ink },
  qrPayload: { fontSize: 11, color: THEME.inkSoft, textAlign: 'center' },
  ghostBtn: {
    borderWidth: 1,
    borderColor: THEME.sage,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  ghostBtnText: {
    color: THEME.sage,
    fontWeight: '700',
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  partyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: THEME.bgAlt,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyBtnText: {
    fontSize: 18,
    color: THEME.ink,
    fontWeight: '700',
  },
  partyValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: THEME.ink,
  },
  errorText: {
    color: THEME.coralDark,
    fontSize: 12,
    marginTop: 8,
  },
  code: {
    fontFamily: 'Menlo',
    fontSize: 12,
    marginTop: 12,
  },
  walletCard: {
    backgroundColor: THEME.ink,
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  walletBalance: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 6,
  },
  walletMeta: {
    color: '#ddd',
    fontSize: 12,
    marginBottom: 2,
  },
  savingsCard: {
    backgroundColor: THEME.bgAlt,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  savingsLabel: {
    color: THEME.inkSoft,
    fontSize: 12,
    marginBottom: 4,
  },
  savingsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.ink,
  },
  dayCard: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  dayHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.ink,
    marginBottom: 8,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  txRowWrap: {
    marginBottom: 6,
  },
  txRowHighlight: {
    backgroundColor: '#FFF2E9',
    borderRadius: 10,
    padding: 8,
  },
  txLabel: {
    fontSize: 12,
    color: THEME.inkSoft,
  },
  txLabelBold: {
    fontWeight: '700',
  },
  txAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.ink,
  },
  txMerchant: {
    fontSize: 11,
    color: THEME.inkSoft,
  },
  txMeta: {
    fontSize: 11,
    color: THEME.inkSoft,
  },
  savingsHighlight: {
    borderColor: THEME.coral,
    borderWidth: 1,
    backgroundColor: '#FFF2E9',
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: THEME.card,
  },
  inputHalf: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    backgroundColor: THEME.card,
    paddingVertical: 12,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
  },
  tabBtnInner: {
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: THEME.coral,
  },
  tabLabel: {
    fontSize: 12,
    color: THEME.inkSoft,
  },
  tabLabelActive: {
    color: THEME.ink,
  },
  badge: {
    marginTop: 4,
    backgroundColor: THEME.coral,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  offerCard: {
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  offerAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: THEME.coral,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
    paddingLeft: 6,
  },
  offerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: THEME.ink,
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium' }),
  },
  pricePill: {
    backgroundColor: THEME.coral,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  pricePillText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  savingsPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 6,
  },
  savingsPillText: { color: '#1B5E20', fontWeight: '700', fontSize: 12 },
  offerMetaRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingLeft: 6,
  },
  offerMetaLabel: {
    fontSize: 11,
    color: THEME.inkSoft,
  },
  offerMetaValue: {
    fontSize: 12,
    color: THEME.ink,
    fontWeight: '600',
  },
  offerBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: THEME.bgAlt,
    color: THEME.inkSoft,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    fontSize: 11,
  },
  bgGlowTop: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FDE2D1',
    opacity: 0.6,
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#DCEBE5',
    opacity: 0.6,
  },
});

export default App;

/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import {Colors} from 'react-native/Libraries/NewAppScreen';
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
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [refunds, setRefunds] = useState<WalletRefund[]>([]);

  useEffect(() => {
    // Auto-load iniziale per demo
    loadOffers();
    loadWallet();
  }, []);

  useEffect(() => {
    if (activeTab === 'wallet') {
      loadWallet();
    }
  }, [activeTab]);

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
      const created = await createReservation({
        userId: authUserId,
        businessId: offer.merchantId,
        flashOfferId: offer.id,
        depositAmount: DEPOSIT_AMOUNT,
      });
      const merchantName =
        'merchant' in offer ? offer.merchant?.name ?? null : null;
      const merchantCity =
        'merchant' in offer ? offer.merchant?.city ?? null : null;
      await holdDeposit({
        reservationId: created.id,
        walletId: w.id,
        amount: DEPOSIT_AMOUNT,
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
      <ScrollView contentContainerStyle={styles.tabContent}>
        <Text style={styles.title}>Offerte</Text>
        <Text style={styles.subtitle}>Città: {DEMO_CITY}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={loadOffers}>
          <Text style={styles.primaryBtnText}>Carica offerte</Text>
        </TouchableOpacity>
        {loading ? <ActivityIndicator /> : null}
        {status ? <Text style={styles.errorText}>{status}</Text> : null}
        {offers.map((o) => (
          <TouchableOpacity key={o.id} style={styles.card} onPress={() => openOffer(o.id)}>
            <Text style={styles.cardTitle}>{o.title}</Text>
            <Text style={styles.cardMeta}>€ {o.price} • {o.startsAt}</Text>
          </TouchableOpacity>
        ))}
        {selectedOffer ? (
          <View style={styles.detailCard}>
            <Text style={styles.cardTitle}>{selectedOffer.title}</Text>
            <Text style={styles.cardMeta}>{selectedOffer.description || '—'}</Text>
            <Text style={styles.cardMeta}>€ {selectedOffer.price}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => bookOffer(selectedOffer)}>
              <Text style={styles.primaryBtnText}>Prenota + garanzia €{DEPOSIT_AMOUNT}</Text>
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
    const totalSavings = transactions.reduce((sum, t) => sum + (t.savings ?? 0), 0);
    const labelForTx = (t: WalletTx) => {
      switch (t.description) {
        case 'deposit_hold':
          return 'Deposito prenotazione';
        case 'deposit_release':
          return 'Deposito riaccreditato';
        case 'deposit_forfeit':
          return 'Forfeit deposito';
        case 'paid':
          return 'Pagamento';
        case 'prepared':
          return 'Pagamento in attesa';
        default:
          return t.description || 'Transazione';
      }
    };
    return (
      <ScrollView contentContainerStyle={styles.tabContent}>
        <Text style={styles.title}>Wallet</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={loadWallet}>
          <Text style={styles.primaryBtnText}>Carica wallet</Text>
        </TouchableOpacity>
        {wallet ? (
          <View style={styles.walletCard}>
            <Text style={styles.walletBalance}>€ {Number(wallet.remaining_credit).toFixed(2)}</Text>
            <Text style={styles.walletMeta}>Taglio: € {Number(wallet.initial_credit).toFixed(2)}</Text>
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
          <Text style={styles.savingsValue}>€ {totalSavings.toFixed(2)}</Text>
        </View>
        <Text style={styles.subtitle}>Transazioni</Text>
        {transactions.length === 0 ? (
          <Text style={styles.subtitle}>Nessuna transazione.</Text>
        ) : (
          transactions.map((t) => (
            <View key={t.id} style={styles.card}>
              <Text style={styles.cardTitle}>{labelForTx(t)}</Text>
              <Text style={styles.cardMeta}>{t.merchant?.name || 'Esercente'}</Text>
              <Text style={styles.cardMeta}>{new Date(t.when).toLocaleString()}</Text>
              <Text style={styles.cardMeta}>Importo: € {t.net_amount ?? t.net_spent}</Text>
              {t.savings != null ? (
                <Text style={styles.cardMeta}>Risparmio: € {t.savings.toFixed(2)}</Text>
              ) : null}
            </View>
          ))
        )}
        {status ? <Text style={styles.errorText}>{status}</Text> : null}
      </ScrollView>
    );
  }

  function renderProfileTab() {
    const taglioDate = wallet?.activated_at || wallet?.created_at;
    const hostAddress = [wallet?.hosts?.address, wallet?.hosts?.city, wallet?.hosts?.country]
      .filter(Boolean)
      .join(', ');
    const checkoutDate = wallet?.users?.checkout_date ? new Date(wallet.users.checkout_date) : null;
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
        <Text style={styles.subtitle}>Tagli acquistati</Text>
        {wallet ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>€ {Number(wallet.initial_credit).toFixed(2)}</Text>
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
              <Text style={styles.cardMeta}>Importo: € {Number(r.amount).toFixed(2)}</Text>
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

  return (
    <View style={{flex:1}}>
      
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
          <TabButton label="Offerte" active={activeTab === 'offers'} onPress={() => setActiveTab('offers')} />
          <TabButton label="Prenotazioni" active={activeTab === 'bookings'} onPress={() => setActiveTab('bookings')} />
          <TabButton label="Wallet" active={activeTab === 'wallet'} onPress={() => setActiveTab('wallet')} />
          <TabButton label="Profilo" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
        </View>
      </View>
    </SafeAreaView>
    </View>
  );
}

function TabButton({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) {
  return (
    <TouchableOpacity style={[styles.tabBtn, active ? styles.tabBtnActive : null]} onPress={onPress}>
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{label}</Text>
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
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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
  input: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: THEME.card,
  },
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

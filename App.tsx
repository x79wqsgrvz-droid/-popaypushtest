/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState} from 'react';
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
  type FlashOfferListItem,
  type FlashOfferDetail,
  type Reservation,
} from './src/api/client';

const DEMO_USER_ID = 1;
const DEMO_HOST_ID = 1;
const DEMO_CITY = 'Camerota';
const DEPOSIT_AMOUNT = 5;
const DEPOSIT_CURRENCY = 'EUR';

type TabKey = 'offers' | 'bookings' | 'wallet' | 'profile';

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  const [activeTab, setActiveTab] = useState<TabKey>('offers');;
  const [token, setToken] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<number>(DEMO_USER_ID);
  const [authHostId, setAuthHostId] = useState<number>(DEMO_HOST_ID);
  const [wallet, setWallet] = useState<any | null>(null);
  const [offers, setOffers] = useState<FlashOfferListItem[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<FlashOfferDetail | null>(null);
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [accessCode, setAccessCode] = useState<string>('');
  const [transactions, setTransactions] = useState<WalletTx[]>([]);

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
    const results = await Promise.all(
      ids.map((id) =>
        getReservation(id)
          .then((r) => r.reservation)
          .catch(() => null)
      )
    );
    setBookings(results.filter(Boolean) as Reservation[]);
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
      setBookings((prev) => [created, ...prev]);
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
      await refreshWallet();
      const authToken = await ensureToken();
      const tx = await getMyTransactions(authUserId, authToken, 20);
      setTransactions(tx.items);
    } catch (err) {
      setStatus(JSON.stringify(err));
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
    return (
      <ScrollView contentContainerStyle={styles.tabContent}>
        <Text style={styles.title}>Prenotazioni</Text>
        {bookings.length === 0 ? <Text style={styles.subtitle}>Nessuna prenotazione ancora.</Text> : null}
        {status ? <Text style={styles.errorText}>{status}</Text> : null}
        {bookings.map((b) => (
          <View key={b.id} style={styles.card}>
            <Text style={styles.cardTitle}>Booking #{b.id}</Text>
            <Text style={styles.cardMeta}>Status: {b.status || '—'}</Text>
            <Text style={styles.cardMeta}>Deposit: {b.deposit_status || '—'}</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => cancelBooking(b.id, true)}>
              <Text style={styles.secondaryBtnText}>Cancella</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    );
  }

  function renderWalletTab() {
    return (
      <ScrollView contentContainerStyle={styles.tabContent}>
        <Text style={styles.title}>Wallet</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={loadWallet}>
          <Text style={styles.primaryBtnText}>Carica wallet</Text>
        </TouchableOpacity>
        {wallet ? (
          <Text style={[styles.code, {color: isDarkMode ? Colors.lighter : Colors.darker}]}>
            {JSON.stringify(wallet, null, 2)}
          </Text>
        ) : (
          <Text style={styles.subtitle}>Nessun wallet caricato.</Text>
        )}
        <Text style={styles.subtitle}>Transazioni</Text>
        {transactions.length === 0 ? (
          <Text style={styles.subtitle}>Nessuna transazione.</Text>
        ) : (
          transactions.map((t) => (
            <View key={t.id} style={styles.card}>
              <Text style={styles.cardTitle}>{t.merchant?.name || 'Esercente'}</Text>
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
    return (
      <View style={styles.tabContent}>
        <Text style={styles.title}>Profilo</Text>
        <Text style={styles.subtitle}>userId={authUserId} • hostId={authHostId}</Text>
        <Text style={styles.subtitle}>Token: {token ? `${token.slice(0, 8)}…` : 'non attivo'}</Text>
        <Text style={styles.subtitle}>Attiva via codice</Text>
        <TextInput
          value={accessCode}
          onChangeText={setAccessCode}
          placeholder="Inserisci access_code"
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
          <Text style={styles.primaryBtnText}>Attiva con codice</Text>
        </TouchableOpacity>
        {status ? <Text style={styles.errorText}>{status}</Text> : null}
      </View>
    );
  }

  return (
    <View style={{flex:1}}>
      
      <SafeAreaView style={[backgroundStyle,{flex:1}]}>
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
    padding: 16,
    paddingBottom: 96,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    marginBottom: 10,
  },
  detailCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eaeaea',
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: '#444',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryBtn: {
    backgroundColor: '#ddd',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  secondaryBtnText: {
    color: '#222',
    fontWeight: '600',
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: '#999',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  ghostBtnText: {
    color: '#333',
    fontWeight: '600',
  },
  errorText: {
    color: '#c00',
    fontSize: 12,
    marginTop: 8,
  },
  code: {
    fontFamily: 'Menlo',
    fontSize: 12,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
  },
  tabLabelActive: {
    color: '#000',
  },
});

export default App;

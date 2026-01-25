/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState} from 'react';
import type {PropsWithChildren} from 'react';
import {
  SafeAreaView,
  ScrollView,
  Button,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {activate, getMyWallet} from './src/api/client';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

const DEMO_USER_ID = 1;
const DEMO_HOST_ID = 1;

function Section({children, title}: SectionProps): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  const [walletJson, setWalletJson] = useState<string>('(nessun wallet ancora)');

  async function runDemo() {
    try {
      // 1) Attiva e ottieni token
      const activation = await activate(DEMO_USER_ID, DEMO_HOST_ID);
      // 2) Usa token per leggere il wallet
      const me = await getMyWallet(DEMO_USER_ID, activation.token);
      const pretty = JSON.stringify(me.wallet, null, 2);
      setWalletJson(pretty);
      // log debug
      console.log('Wallet /me', me.wallet);
    } catch (err) {
      setWalletJson(JSON.stringify(err, null, 2));
      console.log('Errore demo auth', err);
    }
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Section title="Step One">
            Edit <Text style={styles.highlight}>App.tsx</Text> to change this
            screen and then come back to see your edits.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <Section title="PoPay Demo">
            <Text style={styles.sectionDescription}>
              Demo con userId={DEMO_USER_ID} e hostId={DEMO_HOST_ID}
            </Text>
            <Button title="Esegui demo" onPress={runDemo} />
            <Text style={[styles.code, {color: isDarkMode ? Colors.lighter : Colors.darker}]}>
              {walletJson}
            </Text>
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  code: {
    fontFamily: 'Menlo',
    fontSize: 12,
  },
});

export default App;

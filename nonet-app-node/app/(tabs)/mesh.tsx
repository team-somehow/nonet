import React, { useState } from 'react';
import { Alert, View, StyleSheet, ScrollView, Platform } from 'react-native';
import {
  Provider as PaperProvider,
  DefaultTheme,
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  Badge,
  Surface,
  Switch,
  ProgressBar,
  Chip,
} from 'react-native-paper';
import { useBle } from '@/contexts/BleContext';
import { MessageState } from '@/utils/bleUtils';

// --- Theme ---
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#FF5722',
  },
};

const MeshScreen = () => {
  const [message, setMessage] = useState('');

  // Use the global BLE context
  const {
    isBroadcasting,
    hasInternet,
    masterState,
    setHasInternet,
    broadcastMessage,
    startBroadcasting,
    stopBroadcasting,
    clearAllAndStop,
    getCurrentBroadcastInfo,
    getProgressFor,
  } = useBle();

  const handleStartUserBroadcast = async () => {
    try {
      await broadcastMessage(message);
      setMessage('');
    } catch (err) {
      Alert.alert(
        'Error',
        (err as Error).message || 'Failed to encode message'
      );
    }
  };

  // Clear everything & stop (single button)
  const handleClearEverythingAndStop = () => {
    if (masterState.size === 0 && !isBroadcasting) {
      return;
    }

    Alert.alert(
      'Clear Everything & Stop',
      'This will clear received messages, clear the broadcast queue, and stop broadcasting. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all & stop',
          style: 'destructive',
          onPress: clearAllAndStop,
        },
      ]
    );
  };

  const renderReceivedMessageCard = (state: MessageState) => {
    const progress = getProgressFor(state);
    return (
      <Card
        key={`msg-${state.id}`}
        style={[
          styles.messageCard,
          { backgroundColor: state.isAck ? '#e8f5e9' : '#fff3e0' },
        ]}
      >
        <Card.Content>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Title style={styles.messageTitle}>
              {state.isAck ? '✅ Response (ACK)' : '✉️ Request'}
            </Title>
            <Chip compact>{`${progress.percent}%`}</Chip>
          </View>

          <Paragraph numberOfLines={3}>
            {state.fullMessage ||
              (state.isComplete ? '(decoded)' : '(incomplete)')}
          </Paragraph>

          <View style={{ marginTop: 8 }}>
            <Text
              style={{ marginBottom: 6 }}
            >{`Chunks: ${progress.received}/${progress.total}`}</Text>
            <ProgressBar
              progress={progress.percent / 100}
              style={{ height: 8, borderRadius: 6 }}
            />
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}
            >
              {Array.from({ length: state.totalChunks }, (_, i) => {
                const idx = i + 1;
                const have = state.chunks.has(idx);
                return (
                  <Badge
                    key={idx}
                    style={[
                      styles.chunkBadge,
                      have ? styles.chunkHave : styles.chunkMissing,
                    ]}
                  >
                    {idx}
                  </Badge>
                );
              })}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const allMessages = Array.from(masterState.values()).sort(
    (a, b) => b.id - a.id
  );
  const currentBroadcast = getCurrentBroadcastInfo();

  return (
    <PaperProvider theme={theme}>
      <View style={styles.container}>
        <Surface style={styles.broadcasterSection} elevation={2}>
          <Title style={styles.sectionTitle}>Mesh Node</Title>

          <View style={styles.internetSwitchContainer}>
            <Text>Internet Status:</Text>
            <Switch value={hasInternet} onValueChange={setHasInternet} />
            <View style={{ width: 12 }} />
            <Button
              mode="outlined"
              onPress={() => {
                if (isBroadcasting) stopBroadcasting();
                else startBroadcasting();
              }}
            >
              {isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
            </Button>
          </View>

          <View style={{ marginVertical: 8 }}>
            <Text style={{ fontSize: 13, color: '#555' }}>
              Currently broadcasting:
            </Text>
            <Paragraph style={{ fontWeight: '700', marginTop: 2 }}>
              {isBroadcasting && currentBroadcast.text
                ? `🔊 ${currentBroadcast.text}`
                : '— not broadcasting —'}
            </Paragraph>
          </View>

          <TextInput
            mode="outlined"
            label="Broadcast New Message"
            value={message}
            onChangeText={setMessage}
            style={styles.textInput}
            multiline
          />
          <Button
            mode="contained"
            onPress={handleStartUserBroadcast}
            disabled={!message.trim()}
            style={styles.button}
          >
            Broadcast Message
          </Button>
        </Surface>

        <Surface style={styles.receiverSection} elevation={2}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Title style={styles.sectionTitle}>Network Messages</Title>
            <Button mode="text" onPress={handleClearEverythingAndStop} compact>
              Clear
            </Button>
          </View>

          <ScrollView>
            {allMessages.length === 0 ? (
              <Paragraph style={styles.placeholderText}>
                Listening for messages...
              </Paragraph>
            ) : (
              allMessages.map((msg) => renderReceivedMessageCard(msg))
            )}
          </ScrollView>
        </Surface>
      </View>
    </PaperProvider>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f7',
    paddingTop: Platform.OS === 'android' ? 25 : 50,
  },
  broadcasterSection: {
    padding: 15,
    margin: 10,
    borderRadius: 12,
  },
  receiverSection: {
    flex: 1,
    padding: 15,
    margin: 10,
    marginTop: 0,
    borderRadius: 12,
  },
  sectionTitle: {
    textAlign: 'center',
    marginBottom: 12,
  },
  internetSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  textInput: {
    marginBottom: 10,
    minHeight: 64,
  },
  button: {
    paddingVertical: 6,
  },
  placeholderText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
  },
  messageCard: {
    marginBottom: 10,
  },
  messageTitle: {
    fontSize: 16,
  },
  chunkBadge: {
    margin: 3,
    paddingHorizontal: 6,
  },
  chunkHave: {
    backgroundColor: '#c8e6c9',
    color: '#0b6623',
  },
  chunkMissing: {
    backgroundColor: '#ffe0b2',
    color: '#6a4a00',
  },
});

export default MeshScreen;

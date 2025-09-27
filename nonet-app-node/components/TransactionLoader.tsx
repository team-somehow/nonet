import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {
  Icon,
} from 'react-native-paper';
import { Colors } from '@/constants/theme';
import { useWallet, TransactionData } from '@/contexts/WalletContext';
import { useBle } from '@/contexts/BleContext';


// Transaction Flow Steps - Easily editable constants
const TRANSACTION_STEPS = [
  {
    id: 1,
    title: 'Preparing Transaction',
    description: 'Encrypting transaction payload with Web3 cryptography',
    icon: '🔐',
    duration: 2000,
  },
  {
    id: 2,
    title: 'Scanning for Nearby Devices',
    description: 'Looking for Bluetooth-enabled devices in mesh network',
    icon: '📡',
    duration: 3000,
  },
  {
    id: 3,
    title: 'Hopping Through Network',
    description: 'Relaying encrypted payload through offline mesh nodes',
    icon: '🔄',
    duration: 4000,
  },
  {
    id: 4,
    title: 'Finding Internet Gateway',
    description: 'Locating device with active internet connection',
    icon: '🌐',
    duration: 3500,
  },
  {
    id: 5,
    title: 'Broadcasting Transaction',
    description: 'Submitting to blockchain network via gateway device',
    icon: '🚀',
    duration: 2500,
  },
  {
    id: 6,
    title: 'Transaction Confirmed',
    description: 'Successfully broadcasted to the blockchain',
    icon: '✅',
    duration: 1000,
  },
];

const LOADING_MESSAGES = [
  'Establishing secure connection...',
  'Routing through mesh network...',
  'Connecting to gateway node...',
  'Validating transaction...',
  'Broadcasting to blockchain...',
];

interface TransactionLoaderProps {
  onComplete: () => void;
  onCancel?: () => void;
  transactionData?: {
    amount: string;
    currency: string;
    toAddress: string;
    chain: string;
    chainId: number;
  };
}

export const TransactionLoader: React.FC<TransactionLoaderProps> = ({
  onComplete,
  onCancel,
  transactionData,
}) => {
  const { signTransaction, userWalletAddress } = useWallet();
  const { broadcastMessage, getCurrentBroadcastInfo } = useBle();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);
  

  // Add state for logs
  const [logs, setLogs] = useState<string[]>([]);

  // Add animation values for Bluetooth mesh
  const bluetoothPulse = useRef(new Animated.Value(1)).current;
  const circle1Anim = useRef(new Animated.Value(0)).current;
  const circle2Anim = useRef(new Animated.Value(0)).current;
  const circle3Anim = useRef(new Animated.Value(0)).current;

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepAnimations = useRef(
    TRANSACTION_STEPS.map(() => new Animated.Value(0))
  ).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    resetAnimation();
    startTransactionFlow();
  }, []);

  // Function to add logs
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Reset animation and start Bluetooth animation
  const resetAnimation = () => {
    setCurrentStep(0);
    setIsCompleted(false);
    setLoadingMessageIndex(0);
    setLogs([]);
    progressAnim.setValue(0);
    stepAnimations.forEach(anim => anim.setValue(0));
    pulseAnim.setValue(1);
    fadeAnim.setValue(0);
    bluetoothPulse.setValue(1);
    circle1Anim.setValue(0);
    circle2Anim.setValue(0);
    circle3Anim.setValue(0);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    startBluetoothAnimation();
  };

  // Start Bluetooth animation
  const startBluetoothAnimation = () => {
    const heartbeatAnimation = () => {
      Animated.sequence([
        Animated.timing(bluetoothPulse, {
          toValue: 1.3,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bluetoothPulse, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bluetoothPulse, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bluetoothPulse, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!isCompleted) {
          setTimeout(heartbeatAnimation, 1000);
        }
      });
    };

    const meshAnimation = () => {
      Animated.stagger(400, [
        Animated.loop(
          Animated.sequence([
            Animated.timing(circle1Anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(circle1Anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(circle2Anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(circle2Anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(circle3Anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(circle3Anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    };

    heartbeatAnimation();
    meshAnimation();
  };

  // Function to sign the transaction
  const handleTransactionSigning = async () => {
    try {
      if (!transactionData) {
        addLog('❌ No transaction data provided');
        return;
      }

      addLog('🔐 Starting transaction signing...');
      addLog(`💰 Amount: ${transactionData.amount} ${transactionData.currency}`);
      addLog(`🌐 Network: ${transactionData.chain} (ID: ${transactionData.chainId})`);

      // Use the user's wallet address from component level hook

      // Convert amount to wei (assuming amount is in ETH)
      const amountInWei = BigInt(Math.floor(parseFloat(transactionData.amount) * Math.pow(10, 18)));
      const valueHex = '0x' + amountInWei.toString(16);

      // Create transaction data for signing
      const txData: TransactionData = {
        to: transactionData.toAddress,
        value: transactionData.amount,
        gasLimit: '21000',
        gasPrice: '20000000000', // 20 Gwei
        nonce: '0',
        chainId: transactionData.chainId, // Use selected chain ID
      };

      addLog('📝 Creating transaction payload...');
      console.log('🌐 Selected chain:', transactionData.chain, 'Chain ID:', transactionData.chainId);
      console.log('💰 Selected currency:', transactionData.currency);
      console.log('📝 Transaction data:', txData);

      // Sign the transaction using the wallet context
      const signedTransaction = await signTransaction(txData);
      addLog('✅ Transaction signed successfully');

      // Create the local transaction payload
      const transactionPayload = {
        from: userWalletAddress || '0x0000000000000000000000000000000000000000',
        to: transactionData.toAddress,
        value: valueHex,
        gas: '0x' + parseInt(txData.gasLimit || '21000').toString(16),
        gasPrice: '0x' + parseInt(txData.gasPrice || '20000000000').toString(16),
        nonce: '0x' + parseInt(txData.nonce || '0').toString(16),
        chainId: '0x' + txData?.chainId?.toString(16),
        data: txData.data || '0x',
        signature: {
          v: signedTransaction.v,
          r: signedTransaction.r,
          s: signedTransaction.s,
        }
      };

      addLog('📡 Broadcasting via Bluetooth mesh...');
      broadcastMessage(JSON.stringify(transactionPayload));
      addLog('🚀 Transaction broadcast initiated');
      

    } catch (error) {
      addLog(`❌ Error signing transaction: ${error}`);
      console.error('❌ Error signing transaction:', error);
    }
  };

  const startTransactionFlow = async () => {
    let totalDuration = 0;

    TRANSACTION_STEPS.forEach((step, index) => {
      setTimeout(async () => {
        setCurrentStep(index);
        animateStep(index);
        
        if (index < LOADING_MESSAGES.length) {
          setLoadingMessageIndex(index);
        }

        // Sign the transaction during the "Preparing Transaction" step (step 0)
        if (index === 0) {
          await handleTransactionSigning();
        }
      }, totalDuration);

      totalDuration += step.duration;
    });

    // Complete the transaction
    setTimeout(() => {
      setIsCompleted(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    }, totalDuration);
  };

  const animateStep = (stepIndex: number) => {
    // Animate step activation
    Animated.timing(stepAnimations[stepIndex], {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Update progress bar
    Animated.timing(progressAnim, {
      toValue: (stepIndex + 1) / TRANSACTION_STEPS.length,
      duration: 800,
      useNativeDriver: false,
    }).start();

    // Pulse animation for current step
    const pulseAnimation = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (stepIndex === currentStep && !isCompleted) {
          pulseAnimation();
        }
      });
    };

    if (stepIndex < TRANSACTION_STEPS.length - 1) {
      pulseAnimation();
    }
  };

  const renderStep = (step: typeof TRANSACTION_STEPS[0], index: number) => {
    const isActive = index <= currentStep;
    const isCurrent = index === currentStep;
    const isCompleted = index < currentStep;

    const stepOpacity = stepAnimations[index];
    const stepScale = stepAnimations[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    return (
      <Animated.View
        key={step.id}
        style={[
          styles.stepContainer,
          {
            opacity: stepOpacity,
            transform: [{ scale: stepScale }],
          },
        ]}
      >
        <View style={styles.stepIconContainer}>
          <Animated.View
            style={[
              styles.stepIcon,
              isActive && styles.stepIconActive,
              isCompleted && styles.stepIconCompleted,
              isCurrent && {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Text style={[styles.stepIconText, isActive && styles.stepIconTextActive]}>
              {step.icon}
            </Text>
          </Animated.View>
          {index < TRANSACTION_STEPS.length - 1 && (
            <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
          )}
        </View>
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, isActive && styles.stepTitleActive]}>
            {step.title}
          </Text>
          <Text style={[styles.stepDescription, isActive && styles.stepDescriptionActive]}>
            {step.description}
          </Text>
        </View>
      </Animated.View>
    );
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Remove circle animations and simplify layout
  return (
    <SafeAreaView style={styles.fullPageContainer}>
      <View style={styles.centerContainer}>
        <Icon source="bluetooth" size={100} color={Colors.light.tint} />
      </View>
      <ScrollView style={styles.logsContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  fullPageContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logsContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  logText: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 5,
  },
});
